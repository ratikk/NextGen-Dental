npm run build && \
 
# Sync all non-HTML files (immutable cache)
aws s3 sync dist/ s3://nextgendentalaustintx-website \
  --delete \
  --exclude "*.html" \
  --cache-control "max-age=31536000,public,immutable" && \
 
# Sync HTML files (no cache)
aws s3 sync dist/ s3://nextgendentalaustintx-website \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --cache-control "max-age=0,must-revalidate,public" && \
 
# Fix JS MIME types (S3 defaults to text/html for unknown files)
aws s3 cp s3://nextgendentalaustintx-website/_astro/ s3://nextgendentalaustintx-website/_astro/ \
  --recursive \
  --exclude "*" \
  --include "*.js" \
  --content-type "application/javascript" \
  --cache-control "max-age=31536000,public,immutable" \
  --metadata-directive REPLACE && \
 
# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E2UFM2168GVUM7 \
  --paths "/*"
