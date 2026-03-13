// Chunked Upload System — Handles large file uploads via chunked reassembly
// Stores temporary chunks and reassembles them into final file

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const logger = require('@sarkari/logger');

const homeDir = os.homedir();
const CHUNKS_TEMP_DIR = process.env.CHUNKS_TEMP_DIR || path.join(homeDir, 'storage', 'chunks-temp');

const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB per chunk
const CHUNK_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours to complete upload

/**
 * Initialize chunks directory
 */
const initializeChunksDir = async () => {
  try {
    await fs.mkdir(CHUNKS_TEMP_DIR, { recursive: true });
    logger.info(`Chunks temp directory initialized: ${CHUNKS_TEMP_DIR}`);
    await cleanupExpiredChunks();
  } catch (error) {
    logger.error('Failed to initialize chunks directory:', error);
    throw error;
  }
};

/**
 * Generate upload session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Initialize upload session
 */
const initializeUploadSession = async (fileName, totalSize, mimeType) => {
  try {
    const sessionId = generateSessionId();
    const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
    
    await fs.mkdir(sessionDir, { recursive: true });

    // Create session metadata file
    const metadata = {
      sessionId,
      fileName,
      totalSize,
      mimeType,
      createdAt: new Date(),
      chunksReceived: [],
      status: 'uploading',
    };

    await fs.writeFile(
      path.join(sessionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    logger.info(`Upload session initialized: ${sessionId} for ${fileName} (${totalSize} bytes)`);

    return {
      sessionId,
      chunkSize: CHUNK_SIZE,
      totalChunks: Math.ceil(totalSize / CHUNK_SIZE),
    };
  } catch (error) {
    logger.error('Error initializing upload session:', error);
    throw error;
  }
};

/**
 * Save chunk to temporary directory
 */
const saveChunk = async (sessionId, chunkIndex, buffer, chunkHash) => {
  try {
    const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
    
    // Verify session exists
    const metadataPath = path.join(sessionDir, 'metadata.json');
    const metadataRaw = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);

    // Verify chunk hash for integrity
    const calculatedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (chunkHash && chunkHash !== calculatedHash) {
      throw new Error('Chunk hash mismatch - corrupted data');
    }

    // Save chunk
    const chunkPath = path.join(sessionDir, `chunk-${chunkIndex}`);
    await fs.writeFile(chunkPath, buffer);

    // Update metadata
    if (!metadata.chunksReceived.includes(chunkIndex)) {
      metadata.chunksReceived.push(chunkIndex);
      metadata.chunksReceived.sort((a, b) => a - b);
      metadata.lastActivityAt = new Date();
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    logger.info(`Chunk saved: ${sessionId}/chunk-${chunkIndex} (${buffer.length} bytes)`);

    return {
      chunkIndex,
      bytesReceived: buffer.length,
      chunksCompleted: metadata.chunksReceived.length,
    };
  } catch (error) {
    logger.error(`Error saving chunk ${chunkIndex} for session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Get upload progress
 */
const getUploadProgress = async (sessionId) => {
  try {
    const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    const metadataRaw = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);

    const totalChunks = Math.ceil(metadata.totalSize / CHUNK_SIZE);
    const progress = (metadata.chunksReceived.length / totalChunks) * 100;

    return {
      sessionId,
      fileName: metadata.fileName,
      totalSize: metadata.totalSize,
      totalChunks,
      chunksReceived: metadata.chunksReceived.length,
      progress: Math.round(progress * 100) / 100,
      status: metadata.status,
    };
  } catch (error) {
    logger.error(`Error getting upload progress for ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Finalize upload and reassemble chunks
 */
const finalizeUpload = async (sessionId, targetDir, fileType = 'document') => {
  let writeStream = null;
  try {
    const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    const metadataRaw = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);

    const totalChunks = Math.ceil(metadata.totalSize / CHUNK_SIZE);

    // Verify all chunks are received
    if (metadata.chunksReceived.length !== totalChunks) {
      throw new Error(
        `Incomplete upload: expected ${totalChunks} chunks, received ${metadata.chunksReceived.length}`
      );
    }

    // Verify chunk sequence is complete
    for (let i = 0; i < totalChunks; i++) {
      if (!metadata.chunksReceived.includes(i)) {
        throw new Error(`Missing chunk ${i}`);
      }
    }

    // Create final file with timestamp
    const uniqueFileName = `${Date.now()}-${metadata.fileName}`;
    const finalFilePath = path.join(targetDir, uniqueFileName);

    // Reassemble chunks into final file
    logger.info(`Starting reassembly for ${sessionId}: ${totalChunks} chunks → ${uniqueFileName}`);

    writeStream = require('fs').createWriteStream(finalFilePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(sessionDir, `chunk-${i}`);
      const chunkBuffer = await fs.readFile(chunkPath);
      
      await new Promise((resolve, reject) => {
        writeStream.write(chunkBuffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Close write stream and verify file
    await new Promise((resolve, reject) => {
      writeStream.end((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const finalStats = await fs.stat(finalFilePath);

    // Verify file size matches
    if (finalStats.size !== metadata.totalSize) {
      await fs.unlink(finalFilePath);
      throw new Error(
        `File size mismatch: expected ${metadata.totalSize}, got ${finalStats.size}`
      );
    }

    // Clean up session directory
    await cleanupSession(sessionId);

    logger.info(
      `Upload finalized: ${uniqueFileName} (${finalStats.size} bytes from ${totalChunks} chunks)`
    );

    return {
      fileName: uniqueFileName,
      size: finalStats.size,
      mimeType: metadata.mimeType,
      uploadedAt: new Date(),
    };
  } catch (error) {
    if (writeStream) {
      writeStream.destroy();
    }
    logger.error(`Error finalizing upload for session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Abort upload and clean up session
 */
const abortUpload = async (sessionId) => {
  try {
    await cleanupSession(sessionId);
    logger.info(`Upload aborted: ${sessionId}`);
    return { success: true, message: 'Upload aborted' };
  } catch (error) {
    logger.error(`Error aborting upload ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Clean up session directory
 */
const cleanupSession = async (sessionId) => {
  try {
    const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
    const resolved = path.resolve(sessionDir);
    const resolvedTempDir = path.resolve(CHUNKS_TEMP_DIR);

    if (!resolved.startsWith(resolvedTempDir)) {
      throw new Error('Invalid session path');
    }

    // Remove all files in session directory
    const files = await fs.readdir(sessionDir);
    for (const file of files) {
      await fs.unlink(path.join(sessionDir, file));
    }

    // Remove session directory
    await fs.rmdir(sessionDir);
    logger.info(`Session cleaned up: ${sessionId}`);
  } catch (error) {
    logger.warn(`Warning during session cleanup for ${sessionId}:`, error.message);
  }
};

/**
 * Clean up expired upload sessions (older than CHUNK_TIMEOUT)
 */
const cleanupExpiredChunks = async () => {
  try {
    const now = Date.now();
    const sessions = await fs.readdir(CHUNKS_TEMP_DIR);

    for (const sessionId of sessions) {
      try {
        const sessionDir = path.join(CHUNKS_TEMP_DIR, sessionId);
        const metadataPath = path.join(sessionDir, 'metadata.json');

        const metadataRaw = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataRaw);

        const createdAt = new Date(metadata.createdAt).getTime();
        const age = now - createdAt;

        if (age > CHUNK_TIMEOUT) {
          await cleanupSession(sessionId);
          logger.info(`Expired session cleaned up: ${sessionId} (age: ${age}ms)`);
        }
      } catch (error) {
        logger.warn(`Error cleaning expired session ${sessionId}:`, error.message);
      }
    }
  } catch (error) {
    logger.warn('Error cleaning up expired chunks:', error.message);
  }
};

module.exports = {
  initializeChunksDir,
  generateSessionId,
  initializeUploadSession,
  saveChunk,
  getUploadProgress,
  finalizeUpload,
  abortUpload,
  cleanupSession,
  cleanupExpiredChunks,
  CHUNK_SIZE,
};
