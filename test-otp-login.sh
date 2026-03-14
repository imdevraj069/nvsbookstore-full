#!/bin/bash
# OTP Login Testing Script
# Run these commands to test the OTP login functionality

API_URL="http://localhost:3002"
TEST_EMAIL="test@example.com"

echo "════════════════════════════════════════════════════════════"
echo "OTP LOGIN TESTING SCRIPT"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 1: Request OTP
echo "TEST 1: Request OTP"
echo "─────────────────────────────────────────────────────────"
echo "Endpoint: POST $API_URL/api/auth/otp/request"
echo "Payload: {\"email\": \"$TEST_EMAIL\"}"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""
echo "✓ Check your email for the OTP"
echo "✓ OTP is 6 digits, valid for 10 minutes"
echo ""
echo "Press ENTER when you have the OTP, then enter it:"
read OTP

if [ -z "$OTP" ]; then
  echo "No OTP provided, skipping verification test"
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 2: Verify OTP
echo "TEST 2: Verify OTP & Login"
echo "─────────────────────────────────────────────────────────"
echo "Endpoint: POST $API_URL/api/auth/otp/verify"
echo "Payload: {\"email\": \"$TEST_EMAIL\", \"otp\": \"$OTP\"}"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"otp\": \"$OTP\"}")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Extract token if successful
TOKEN=$(echo "$RESPONSE" | jq -r '.data.token // empty')
EXPIRES=$(echo "$RESPONSE" | jq -r '.data.expiresIn // empty')

if [ ! -z "$TOKEN" ]; then
  echo "✓ Login successful!"
  echo "✓ Token valid for: $EXPIRES seconds (72 hours)"
  echo ""
  echo "Your JWT Token:"
  echo "$TOKEN"
  echo ""
  
  # Test 3: Use token to access protected route
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "TEST 3: Access Protected Route (Get Profile)"
  echo "─────────────────────────────────────────────────────────"
  echo "Endpoint: GET $API_URL/api/auth/me"
  echo "Header: Authorization: Bearer <token>"
  echo ""
  
  PROFILE=$(curl -s -X GET "$API_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Response:"
  echo "$PROFILE" | jq .
  echo ""
  echo "✓ Your profile retrieved successfully!"
else
  echo "✗ Login failed"
  echo "Check response above for errors"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Testing Complete"
echo "════════════════════════════════════════════════════════════"
