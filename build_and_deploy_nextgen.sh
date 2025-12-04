npm run build && \
AWS_REGION=us-east-1 aws s3 sync dist/ s3://nextgendentalaustintx-website --delete --exclude "*.html" --cache-control "max-age=31536000,public,immutable" && \
AWS_REGION=us-east-1 aws s3 sync dist/ s3://nextgendentalaustintx-website --delete --exclude "*" --include "*.html" --cache-control "max-age=0,no-cache,no-store,must-revalidate" && \
AWS_REGION=us-east-1 aws cloudfront create-invalidation --distribution-id E2UFM2168GVUM7 --paths "/*"
