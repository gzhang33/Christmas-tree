# Cloudinary Setup Guide

To optimize image loading speed and bandwidth, this project supports automatic Cloudinary URL transformations.

## 1. Create a Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com/) and sign up for a default **Free** account.
2. Verify your email and log in to the Console.

## 2. Get Your Credentials
In the **Dashboard** (Programmable Media), note down your:
- **Cloud Name** (e.g., `dxyxyz123`)

## 3. Uploading Images
You have two main ways to use Cloudinary images in this app:

### Method A: Manual Upload (Easiest for testing)
1. Go to **Media Library** in Cloudinary Console.
2. Click **Upload** and select your photos.
3. Once uploaded, hover over an image, click the "Link" icon (Copy URL).
4. The URL looks like: `https://res.cloudinary.com/<your-cloud-name>/image/upload/v12345/sample.jpg`.
5. Use this URL in your application (e.g., in `assets.ts` or when passing photo data).

### Method B: Frontend Upload Widget (Advanced)
To let users upload directly to your Cloudinary:
1. Go to **Settings > Upload > Upload presets**.
2. Click **Add Upload Preset**.
3. Set **Signing Mode** to `Unsigned`.
4. Save the preset name (e.g., `christmas_tree_preset`).
5. Use the Cloudinary Upload Widget in your React code using `react-cloudinary-upload-widget` or raw JS.

## 4. How the Optimization Works
The project currently includes a utility `src/utils/cloudinaryUtils.ts`.
It automatically intercepts Cloudinary URLs and injects performance parameters:
- `w_512`: Resizes image to 512px width (perfect for Polaroids, drastic size reduction from 4K).
- `f_auto`: Serves WebP/AVIF automatically based on browser.
- `q_auto`: Optimizes quality/compression balance.

## 5. Implementation Example
If you manually copied a URL:
`https://res.cloudinary.com/demo/image/upload/sample.jpg`

The app will automatically request:
`https://res.cloudinary.com/demo/image/upload/w_512,q_auto,f_auto/sample.jpg`

This reduces a typical 5MB photo to ~50KB without visible quality loss on the 3D card.
