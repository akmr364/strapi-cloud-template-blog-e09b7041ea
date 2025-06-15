module.exports = ({ env }) => ({
  'wordpress-sync': {
    enabled: true,
    config: {
      wordpressUrl: env('WORDPRESS_URL'),
      syncInterval: env.int('SYNC_INTERVAL', 300000), // 5 minutes
      webhookSecret: env('WEBHOOK_SECRET'),
    }
  }
});
