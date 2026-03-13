// Chunked Upload Utility for Frontend
// Handles large file uploads with progress tracking and error recovery

/**
 * Calculate SHA256 hash of a blob
 */
export const calculateHash = async (blob) => {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Initialize chunked upload session
 */
export const initializeChunkedUpload = async (file, authToken) => {
  const response = await fetch('/api/admin/documents/chunk/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      totalSize: file.size,
      mimeType: file.type,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Init failed (${response.status}):`, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error || `Upload initialization failed: ${response.status}`);
    } catch {
      throw new Error(`Upload initialization failed with status ${response.status}: ${errorText}`);
    }
  }

  return await response.json();
};

/**
 * Upload a single chunk
 */
export const uploadChunk = async (sessionId, chunkIndex, chunkBlob, authToken) => {
  const formData = new FormData();
  formData.append('chunk', chunkBlob);

  // Calculate hash for integrity verification
  const hash = await calculateHash(chunkBlob);

  const response = await fetch(
    `/api/admin/documents/chunk/upload?sessionId=${sessionId}&chunkIndex=${chunkIndex}&hash=${hash}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Chunk upload failed (${response.status}):`, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error || `Failed to upload chunk ${chunkIndex}: ${response.status}`);
    } catch {
      throw new Error(`Failed to upload chunk ${chunkIndex} with status ${response.status}: ${errorText}`);
    }
  }

  return await response.json();
};

/**
 * Get upload progress
 */
export const getUploadProgress = async (sessionId, authToken) => {
  const response = await fetch(`/api/admin/documents/chunk/progress/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get progress');
  }

  return await response.json();
};

/**
 * Finalize chunked upload
 */
export const finalizeChunkedUpload = async (sessionId, authToken) => {
  const response = await fetch('/api/admin/documents/chunk/finalize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to finalize upload');
  }

  return await response.json();
};

/**
 * Abort upload session
 */
export const abortChunkedUpload = async (sessionId, authToken) => {
  const response = await fetch('/api/admin/documents/chunk/abort', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to abort upload');
  }

  return await response.json();
};

/**
 * Main function to handle complete chunked upload
 * Returns: { sessionId, progress callback, finalize function, abort function }
 */
export const createChunkedUploadHandler = async (file, authToken, options = {}) => {
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  console.log(`[ChunkUpload] Starting chunked upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  // Initialize session
  console.log('[ChunkUpload] Initializing upload session...');
  const initResult = await initializeChunkedUpload(file, authToken);
  const sessionId = initResult.data.sessionId;
  const totalChunks = initResult.data.totalChunks;

  console.log(`[ChunkUpload] Session initialized - ID: ${sessionId}, Total chunks: ${totalChunks}`);

  let uploadedChunks = new Set();
  let isAborted = false;

  /**
   * Upload a chunk with retry logic
   */
  const uploadChunkWithRetry = async (chunkIndex, startByte, endByte) => {
    if (isAborted) {
      throw new Error('Upload aborted');
    }

    const chunk = file.slice(startByte, endByte);
    let lastError;
    const chunkSizeMB = (chunk.size / 1024 / 1024).toFixed(2);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[ChunkUpload] Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunkSizeMB} MB) - Attempt ${attempt + 1}/${MAX_RETRIES}`);
        await uploadChunk(sessionId, chunkIndex, chunk, authToken);
        uploadedChunks.add(chunkIndex);
        console.log(`[ChunkUpload] Chunk ${chunkIndex + 1} uploaded successfully`);
        return;
      } catch (error) {
        lastError = error;
        console.error(`[ChunkUpload] Chunk ${chunkIndex + 1} upload failed:`, error.message);
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY * (attempt + 1);
          console.log(`[ChunkUpload] Retrying chunk ${chunkIndex + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} retries: ${lastError.message}`);
  };

  /**
   * Upload all chunks sequentially
   */
  const uploadAllChunks = async (onProgress) => {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (isAborted) {
        throw new Error('Upload aborted');
      }

      const startByte = chunkIndex * CHUNK_SIZE;
      const endByte = Math.min(startByte + CHUNK_SIZE, file.size);

      await uploadChunkWithRetry(chunkIndex, startByte, endByte);

      if (onProgress) {
        const progress = ((uploadedChunks.size / totalChunks) * 100).toFixed(2);
        onProgress({
          sessionId,
          chunkIndex,
          totalChunks,
          uploadedChunks: uploadedChunks.size,
          progress: parseFloat(progress),
          bytesUploaded: startByte + (endByte - startByte),
          totalBytes: file.size,
        });
      }
    }
  };

  /**
   * Finalize upload
   */
  const finalize = async () => {
    if (isAborted) {
      throw new Error('Upload was aborted');
    }

    const result = await finalizeChunkedUpload(sessionId, authToken);
    return result.data;
  };

  /**
   * Abort upload
   */
  const abort = async () => {
    isAborted = true;
    await abortChunkedUpload(sessionId, authToken);
  };

  /**
   * Resume upload from saved state
   */
  const resume = async (onProgress) => {
    if (isAborted) {
      throw new Error('Cannot resume aborted upload');
    }

    // Get current progress
    const progressResult = await getUploadProgress(sessionId, authToken);
    const chunksReceived = progressResult.data.chunksReceived || [];
    uploadedChunks = new Set(chunksReceived);

    // Upload missing chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (!uploadedChunks.has(chunkIndex)) {
        if (isAborted) {
          throw new Error('Upload aborted');
        }

        const startByte = chunkIndex * CHUNK_SIZE;
        const endByte = Math.min(startByte + CHUNK_SIZE, file.size);

        await uploadChunkWithRetry(chunkIndex, startByte, endByte);

        if (onProgress) {
          const progress = ((uploadedChunks.size / totalChunks) * 100).toFixed(2);
          onProgress({
            sessionId,
            chunkIndex,
            totalChunks,
            uploadedChunks: uploadedChunks.size,
            progress: parseFloat(progress),
            bytesUploaded: startByte + (endByte - startByte),
            totalBytes: file.size,
          });
        }
      }
    }
  };

  return {
    sessionId,
    totalChunks,
    uploadAllChunks,
    finalize,
    abort,
    resume,
    getProgress: () => ({
      sessionId,
      uploadedChunks: uploadedChunks.size,
      totalChunks,
      progress: ((uploadedChunks.size / totalChunks) * 100).toFixed(2),
    }),
  };
};

/**
 * Legacy single-file upload (for files under 50 MB)
 */
export const uploadDocumentSingleFile = async (file, authToken) => {
  const formData = new FormData();
  formData.append('document', file);

  const response = await fetch('/api/admin/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload document');
  }

  return await response.json();
};

/**
 * Smart upload wrapper - uses chunked for large files, single for small
 */
export const uploadDocument = async (file, authToken, onProgress) => {
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB

  if (file.size <= CHUNK_SIZE) {
    // Use single-file upload for small files
    return await uploadDocumentSingleFile(file, authToken);
  } else {
    // Use chunked upload for large files
    const handler = await createChunkedUploadHandler(file, authToken);
    await handler.uploadAllChunks(onProgress);
    return await handler.finalize();
  }
};
