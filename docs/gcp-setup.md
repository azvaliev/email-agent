# Google Cloud Platform Setup for Gmail Push Notifications

This guide covers the one-time GCP configuration needed for Gmail push notifications.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed
- A GCP project with billing enabled
- The Gmail API enabled in your project

## 1. Set Your Project

```bash
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

## 2. Enable Required APIs

```bash
gcloud services enable gmail.googleapis.com
gcloud services enable pubsub.googleapis.com
```

## 3. Create Pub/Sub Topic

```bash
gcloud pubsub topics create gmail-notifications
```

## 4. Grant Gmail Permission to Publish

Gmail needs permission to publish to your topic. Grant the Gmail service account publisher access:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

## 5. Create Service Account for Push Authentication

Pub/Sub needs a service account to sign JWTs for authenticated push:

```bash
gcloud iam service-accounts create gmail-push-auth \
  --display-name="Gmail Push Notifications Auth"
```

## 6. Create Push Subscription

Replace `YOUR_WEBHOOK_URL` with your deployed webhook URL:

```bash
# For production
export WEBHOOK_URL="https://your-app.vercel.app/api/webhook/gmail"

# Create the subscription with authentication
gcloud pubsub subscriptions create gmail-notifications-push \
  --topic=gmail-notifications \
  --push-endpoint=$WEBHOOK_URL \
  --push-auth-service-account=gmail-push-auth@$PROJECT_ID.iam.gserviceaccount.com \
  --ack-deadline=60
```

### Note on Push Authentication

The `--push-auth-service-account` flag configures Pub/Sub to sign requests with a JWT. Your webhook verifies this JWT to ensure requests are from Google.

## 7. Verify Setup

List your topic and subscription:

```bash
gcloud pubsub topics list
gcloud pubsub subscriptions list
```

## 8. Update Environment Variables

Add these to your `.env`:

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GMAIL_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications
```

## Testing the Webhook

You can manually publish a test message to verify your webhook:

```bash
gcloud pubsub topics publish gmail-notifications \
  --message='{"emailAddress":"test@gmail.com","historyId":"12345"}'
```

Check your Vercel logs to see if the webhook received it (it will fail JWT verification for manual publishes, but you'll see the attempt).

## Troubleshooting

### Subscription shows "Push failed"

1. Check that your webhook URL is publicly accessible
2. Verify the webhook returns 200 OK
3. Check Vercel function logs for errors

### JWT Verification Fails

1. Ensure the service account email matches what you configured
2. Check that the audience (webhook URL) matches exactly
3. Verify the token hasn't expired (tokens are valid for ~1 hour)

### No Notifications Received

1. Verify `gmail.users.watch()` was called successfully
2. Check the watch expiration hasn't passed
3. Ensure the Gmail account has new emails arriving

## Cleanup

If you need to remove the setup:

```bash
gcloud pubsub subscriptions delete gmail-notifications-push
gcloud pubsub topics delete gmail-notifications
```
