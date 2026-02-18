FROM nginx:1.25-alpine

# Remove default nginx config and html
RUN rm /etc/nginx/nginx.conf && \
    rm -rf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create a placeholder index.html (will be replaced by volume mount in production)
RUN echo '<!DOCTYPE html><html><head><title>Loading...</title></head><body><h1>Loading AdvancedDashboard...</h1></body></html>' > /usr/share/nginx/html/index.html

# Create necessary directories and set permissions
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
