'use strict';

const axios = require('axios');

module.exports = {
  async fetchWordPressData(endpoint) {
    const wordpressUrl = process.env.WORDPRESS_URL || 'https://yourdomain.com';
    const url = `${wordpressUrl}/wp-json/wp/v2/${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Strapi-WordPress-Sync/1.0'
        }
      });
      
      return response.data;
    } catch (error) {
      strapi.log.error(`WordPress fetch error: ${error.message}`);
      return null;
    }
  },

  async syncPosts() {
    try {
      const posts = await this.fetchWordPressData('posts?per_page=100&_embed');
      
      if (!posts) {
        strapi.log.error('No posts received from WordPress');
        return;
      }

      for (const post of posts) {
        await this.processPost(post);
      }
      
      strapi.log.info(`Successfully synced ${posts.length} posts`);
    } catch (error) {
      strapi.log.error('Post sync failed:', error);
    }
  },

  async processPost(wpPost) {
    try {
      // Check if post already exists
      const existingPost = await strapi.entityService.findMany('api::post.post', {
        filters: { wordpress_id: wpPost.id },
        limit: 1
      });

      const postData = {
        wordpress_id: wpPost.id,
        title: wpPost.title.rendered,
        content: wpPost.content.rendered,
        excerpt: wpPost.excerpt.rendered,
        slug: wpPost.slug,
        status: wpPost.status,
        wordpress_date: wpPost.date,
        wordpress_modified: wpPost.modified,
        featured_image: wpPost.featured_media ? await this.processFeaturedImage(wpPost.featured_media) : null,
        publishedAt: wpPost.status === 'publish' ? new Date(wpPost.date) : null
      };

      if (existingPost.length > 0) {
        await strapi.entityService.update('api::post.post', existingPost[0].id, {
          data: postData
        });
      } else {
        await strapi.entityService.create('api::post.post', {
          data: postData
        });
      }
    } catch (error) {
      strapi.log.error(`Error processing post ${wpPost.id}:`, error);
    }
  },

  async processFeaturedImage(mediaId) {
    try {
      const media = await this.fetchWordPressData(`media/${mediaId}`);
      if (media) {
        return {
          url: media.source_url,
          alt: media.alt_text,
          caption: media.caption.rendered
        };
      }
    } catch (error) {
      strapi.log.error('Error fetching featured image:', error);
    }
    return null;
  },

  async handleWordPressWebhook(data) {
    try {
      if (data.post_type === 'post') {
        const post = await this.fetchWordPressData(`posts/${data.post_id}`);
        if (post) {
          await this.processPost(post);
          strapi.log.info(`Webhook processed for post ${data.post_id}`);
        }
      }
    } catch (error) {
      strapi.log.error('Webhook processing failed:', error);
    }
  }
};
