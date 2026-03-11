# API Architecture

> **Auto-generated from Swagger/OpenAPI specification**
> Last updated: 2026-03-11T15:46:17.134Z

## Chatr API

**Version**: 1.0.0

Real-time chat application API with 2FA authentication and JWT token security

## Base URL

- **Development server**: `http://localhost:3001`

## Authentication

### bearerAuth

- **Type**: http
- **Scheme**: bearer
- **Format**: JWT
- **Description**: Enter your JWT token in the format: Bearer <token>

## Endpoints

### 2FA

#### POST /api/auth/2fa/setup

**Generate 2FA secret and QR code**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "userId"
  ],
  "properties": {
    "userId": {
      "type": "string"
    }
  }
}
```

**Responses:**

- **200**: 2FA setup data generated
  ```json
  {
    "type": "object",
    "properties": {
      "secret": {
        "type": "string"
      },
      "qrCode": {
        "type": "string",
        "description": "Base64 encoded QR code image"
      },
      "otpauth": {
        "type": "string"
      }
    }
  }
  ```
- **404**: User not found

---

#### POST /api/auth/2fa/verify

**Verify 2FA code and enable 2FA**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "userId",
    "code"
  ],
  "properties": {
    "userId": {
      "type": "string"
    },
    "code": {
      "type": "string",
      "description": "6-digit TOTP code"
    }
  }
}
```

**Responses:**

- **200**: 2FA enabled successfully
  ```json
  {
    "type": "object",
    "properties": {
      "message": {
        "type": "string"
      },
      "token": {
        "type": "string"
      },
      "user": {
        "type": "object"
      }
    }
  }
  ```
- **401**: Invalid 2FA code

---

### Auth

#### POST /api/auth/verify-phone

**Verify phone number with code (returns JWT token)**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "userId",
    "code"
  ],
  "properties": {
    "userId": {
      "type": "string"
    },
    "code": {
      "type": "string",
      "description": "6-digit verification code"
    }
  }
}
```

**Responses:**

- **200**: Phone verified successfully, returns JWT token
  ```json
  {
    "type": "object",
    "properties": {
      "message": {
        "type": "string"
      },
      "token": {
        "type": "string",
        "description": "JWT token (valid for 7 days)"
      },
      "user": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "phoneNumber": {
            "type": "string"
          },
          "username": {
            "type": "string"
          },
          "emailVerified": {
            "type": "boolean"
          },
          "phoneVerified": {
            "type": "boolean"
          }
        }
      }
    }
  }
  ```
- **401**: Invalid or expired code

---

### Authentication

#### POST /api/auth/register

**Register a new user**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "email",
    "username",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 20
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "description": "Must include at least one capital letter and one special character"
    }
  }
}
```

**Responses:**

- **201**: User registered successfully
  ```json
  {
    "type": "object",
    "properties": {
      "message": {
        "type": "string"
      },
      "userId": {
        "type": "string"
      },
      "requiresTwoFactorSetup": {
        "type": "boolean"
      }
    }
  }
  ```
- **400**: Invalid input
- **409**: Email or username already exists

---

#### POST /api/auth/login

**Login user with email or username**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "description": "Email address or username (with or without @ prefix)",
      "example": "user@example.com or @johndoe or johndoe"
    },
    "password": {
      "type": "string"
    },
    "twoFactorCode": {
      "type": "string",
      "description": "6-digit TOTP code (required if 2FA enabled)"
    }
  }
}
```

**Responses:**

- **200**: Login successful or 2FA required
  ```json
  {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "requiresTwoFactor": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          }
        }
      },
      {
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          },
          "token": {
            "type": "string"
          },
          "user": {
            "type": "object"
          }
        }
      }
    ]
  }
  ```
- **401**: Invalid credentials or 2FA code

---

#### POST /api/auth/verify-email

**Verify email with 6-digit code**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "userId",
    "code"
  ],
  "properties": {
    "userId": {
      "type": "string"
    },
    "code": {
      "type": "string",
      "description": "6-digit verification code"
    }
  }
}
```

**Responses:**

- **200**: Email verified successfully
- **401**: Invalid or expired code

---

#### POST /api/auth/forgot-password

**Request password reset email**

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "email"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    }
  }
}
```

**Responses:**

- **200**: Reset email sent (or user not found - same response for security)

---

### Conversations

#### POST /api/conversations/{id}/accept

**Accept a message request**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `id` | path | string | ✅ | Conversation ID |

**Responses:**

- **200**: Message request accepted
- **403**: Not authorised to accept this request
- **404**: Conversation not found

---

#### POST /api/conversations/{id}/decline

**Decline a message request**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `id` | path | string | ✅ | Conversation ID |

**Responses:**

- **200**: Message request declined
- **403**: Not authorised to decline this request
- **404**: Conversation not found

---

#### POST /api/conversations/{id}/nuke

**Nuke a conversation (delete conversation + all messages between both users)**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `id` | path | string | ✅ | Conversation ID |

**Responses:**

- **200**: Conversation nuked
- **403**: Not authorised
- **404**: Conversation not found

---

#### POST /api/conversations/nuke-by-user/{recipientId}

**Nuke all messages and conversation with a specific user**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recipientId` | path | string | ✅ | The other user's ID |

**Responses:**

- **200**: Conversation nuked

---

### Friends

#### GET /api/friends

**Get accepted friends list**

🔒 **Authentication Required**: Yes

**Responses:**

- **200**: List of accepted friends

---

#### GET /api/friends/requests/incoming

**Get incoming friend requests**

🔒 **Authentication Required**: Yes

---

#### GET /api/friends/requests/outgoing

**Get outgoing friend requests**

🔒 **Authentication Required**: Yes

---

#### GET /api/friends/search

**Search users to add as friends**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `q` | query | string | ✅ | Search query (username, displayName, or email) |

---

#### POST /api/friends/request

**Send a friend request**

🔒 **Authentication Required**: Yes

---

#### POST /api/friends/{friendshipId}/accept

**Accept a friend request**

🔒 **Authentication Required**: Yes

---

#### POST /api/friends/{friendshipId}/decline

**Decline or cancel a friend request**

🔒 **Authentication Required**: Yes

---

#### DELETE /api/friends/{friendshipId}

**Remove a friend**

🔒 **Authentication Required**: Yes

---

#### POST /api/friends/{userId}/block

**Block a user**

🔒 **Authentication Required**: Yes

---

#### POST /api/friends/{userId}/unblock

**Unblock a user**

🔒 **Authentication Required**: Yes

---

#### GET /api/friends/blocked

**Get blocked users list**

🔒 **Authentication Required**: Yes

---

#### GET /api/friends/{targetUserId}/block-status

**Check if a block exists between the current user and target user**

🔒 **Authentication Required**: Yes

---

### Messages

#### POST /api/messages/upload

**Upload file or image for messaging**

🔒 **Authentication Required**: Yes

**Request Body:**

Content-Type: `multipart/form-data`

```json
{
  "type": "object",
  "required": [
    "file",
    "recipientId"
  ],
  "properties": {
    "file": {
      "type": "string",
      "format": "binary",
      "description": "File or image to upload"
    },
    "recipientId": {
      "type": "string",
      "description": "Recipient user ID"
    },
    "type": {
      "type": "string",
      "enum": [
        "image",
        "file",
        "audio"
      ],
      "description": "Type of content (image, file, or audio for voice messages)"
    }
  }
}
```

**Responses:**

- **200**: File uploaded successfully
  ```json
  {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean"
      },
      "messageId": {
        "type": "string"
      },
      "fileUrl": {
        "type": "string"
      },
      "fileName": {
        "type": "string"
      },
      "fileSize": {
        "type": "number"
      },
      "fileType": {
        "type": "string"
      }
    }
  }
  ```
- **400**: Bad request
- **413**: File too large

---

#### GET /api/messages/{recipientId}

**Get message history with a user**

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `recipientId` | path | string | ✅ | The ID of the other user |
| `limit` | query | integer | ❌ | Max number of messages to return |
| `before` | query | string | ❌ | Cursor — return messages before this message ID (for pagination) |

**Responses:**

- **200**: Paginated message history
  ```json
  {
    "type": "object",
    "properties": {
      "messages": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Message"
        }
      },
      "hasMore": {
        "type": "boolean"
      }
    }
  }
  ```
- **401**: Unauthorized

---

#### GET /api/messages/{id}/edits

**Get the edit history of a message**

Returns the full audit trail of previous content versions. Accessible to sender and recipient only. History is retained even after unsend for legal compliance.

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `id` | path | string | ✅ | Message ID |

**Responses:**

- **200**: Edit history
  ```json
  {
    "type": "object",
    "properties": {
      "messageId": {
        "type": "string"
      },
      "edits": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "previousContent": {
              "type": "string"
            },
            "editedAt": {
              "type": "string",
              "format": "date-time"
            },
            "editedBy": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "username": {
                  "type": "string"
                },
                "displayName": {
                  "type": "string",
                  "nullable": true
                }
              }
            }
          }
        }
      }
    }
  }
  ```
- **403**: Forbidden — not sender or recipient
- **404**: Message not found

---

#### PATCH /api/messages/{id}/waveform

**Update audio waveform data**

Called after client-side waveform analysis completes. Stores the waveform samples and broadcasts them to both parties via `audio:waveform` socket event.

🔒 **Authentication Required**: Yes

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `id` | path | string | ✅ | Message ID |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "waveform"
  ],
  "properties": {
    "waveform": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Normalised amplitude samples (0–1), 10 per second"
    },
    "duration": {
      "type": "number",
      "description": "Audio duration in seconds"
    }
  }
}
```

**Responses:**

- **200**: Waveform saved
  ```json
  {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean"
      }
    }
  }
  ```
- **400**: waveform array required
- **401**: Unauthorized

---

### Users

#### GET /api/users

**Get all verified users (for contacts/testing)**

🔒 **Authentication Required**: Yes

**Responses:**

- **200**: List of verified users
  ```json
  {
    "type": "object",
    "properties": {
      "users": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "username": {
              "type": "string"
            },
            "email": {
              "type": "string"
            },
            "emailVerified": {
              "type": "boolean"
            }
          }
        }
      }
    }
  }
  ```
- **401**: Unauthorized

---

#### GET /api/users/check-username

**Check if username is available**

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `username` | query | string | ✅ | Username to check (with or without @ prefix) |

**Responses:**

- **200**: Username availability status
  ```json
  {
    "type": "object",
    "properties": {
      "available": {
        "type": "boolean"
      }
    }
  }
  ```
- **400**: Username is required
- **500**: Internal server error

---

#### GET /api/users/suggest-username

**Get username suggestions**

**Parameters:**

| Name | In | Type | Required | Description |
|------|-------|------|----------|-------------|
| `username` | query | string | ✅ | Base username to generate suggestions from |

**Responses:**

- **200**: Username suggestions
  ```json
  {
    "type": "object",
    "properties": {
      "suggestions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Array of 3 available username suggestions"
      }
    }
  }
  ```
- **400**: Username is required
- **500**: Internal server error

---

#### GET /api/users/me

**Get current authenticated user**

🔒 **Authentication Required**: Yes

**Responses:**

- **200**: Current user information
  ```json
  {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "phoneNumber": {
        "type": "string"
      },
      "username": {
        "type": "string"
      },
      "profileImage": {
        "type": "string"
      },
      "emailVerified": {
        "type": "boolean"
      },
      "phoneVerified": {
        "type": "boolean"
      }
    }
  }
  ```
- **401**: Access token required
- **403**: Invalid or expired token
- **404**: User not found

---

#### POST /api/users/profile-image

**Upload profile image**

🔒 **Authentication Required**: Yes

**Request Body:**

Content-Type: `multipart/form-data`

```json
{
  "type": "object",
  "required": [
    "profileImage"
  ],
  "properties": {
    "profileImage": {
      "type": "string",
      "format": "binary",
      "description": "Image file (JPEG, PNG, WebP, max 5MB)"
    }
  }
}
```

**Responses:**

- **200**: Profile image uploaded successfully
  ```json
  {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "URL to access the uploaded image"
      }
    }
  }
  ```
- **400**: No file uploaded
- **401**: Access token required
- **403**: Invalid or expired token
- **500**: Failed to update database

---

#### DELETE /api/users/profile-image

**Delete profile image**

🔒 **Authentication Required**: Yes

**Responses:**

- **200**: Profile image deleted successfully
- **401**: Authentication required
- **500**: Failed to delete image

---

#### POST /api/users/cover-image

**Upload cover image**

🔒 **Authentication Required**: Yes

**Request Body:**

Content-Type: `multipart/form-data`

```json
{
  "type": "object",
  "properties": {
    "coverImage": {
      "type": "string",
      "format": "binary"
    }
  }
}
```

**Responses:**

- **200**: Cover image uploaded successfully
  ```json
  {
    "type": "object",
    "properties": {
      "url": {
        "type": "string"
      }
    }
  }
  ```
- **400**: No file uploaded
- **401**: Authentication required
- **500**: Upload failed

---

#### DELETE /api/users/cover-image

**Delete cover image**

🔒 **Authentication Required**: Yes

**Responses:**

- **200**: Cover image deleted successfully
- **401**: Authentication required
- **500**: Failed to delete image

---

## Data Models

### Message

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "senderId": {
      "type": "string"
    },
    "senderUsername": {
      "type": "string"
    },
    "senderDisplayName": {
      "type": "string",
      "nullable": true
    },
    "senderProfileImage": {
      "type": "string",
      "nullable": true
    },
    "recipientId": {
      "type": "string"
    },
    "content": {
      "type": "string"
    },
    "type": {
      "type": "string",
      "enum": [
        "text",
        "image",
        "file",
        "audio"
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "sent",
        "delivered",
        "read"
      ]
    },
    "unsent": {
      "type": "boolean"
    },
    "edited": {
      "type": "boolean"
    },
    "fileUrl": {
      "type": "string",
      "nullable": true
    },
    "fileName": {
      "type": "string",
      "nullable": true
    },
    "fileSize": {
      "type": "integer",
      "nullable": true
    },
    "fileType": {
      "type": "string",
      "nullable": true
    },
    "waveform": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "nullable": true,
      "description": "Audio waveform samples (0–1), 10 samples per second"
    },
    "duration": {
      "type": "number",
      "nullable": true,
      "description": "Audio duration in seconds"
    },
    "reactions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string"
          },
          "username": {
            "type": "string"
          },
          "emoji": {
            "type": "string"
          }
        }
      }
    },
    "replyTo": {
      "type": "object",
      "nullable": true,
      "properties": {
        "id": {
          "type": "string"
        },
        "content": {
          "type": "string"
        },
        "senderDisplayName": {
          "type": "string",
          "nullable": true
        },
        "senderUsername": {
          "type": "string"
        },
        "type": {
          "type": "string"
        },
        "duration": {
          "type": "number",
          "nullable": true
        }
      }
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

---

## Documentation

This documentation is automatically generated from the OpenAPI/Swagger specification.

- **Interactive API Docs**: Visit `http://localhost:3001/api/docs` when the server is running
- **Swagger Spec**: Available at `http://localhost:3001/api/docs.json`

To regenerate this documentation:

```bash
cd backend
npm run build
npm run generate-docs
```
