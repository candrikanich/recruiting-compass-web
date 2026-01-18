/**
 * Instagram Graph API Service
 * Handles fetching media from coaches and programs
 */

import { sanitizeHtml } from '~/utils/validation/sanitize'

interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  media_url: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

interface SocialMediaPostData {
  platform: 'twitter' | 'instagram'
  post_url: string
  post_content: string
  post_date: string
  author_name: string
  author_handle: string
  engagement_count: number
  is_recruiting_related: boolean
}

export class InstagramService {
  private accessToken: string
  private apiUrl = 'https://graph.instagram.com'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Fetch media for a single Instagram handle
   */
  async getUserMedia(
    username: string,
    limit: number = 10
  ): Promise<SocialMediaPostData[]> {
    if (!this.accessToken) {
      console.warn('Instagram Access Token not configured')
      return []
    }

    try {
      // First, get Instagram user ID from username
      const userResponse = await fetch(
        `${this.apiUrl}/ig_hashtag_search?user_id=${username}&fields=id,username&access_token=${this.accessToken}`,
        { method: 'GET' }
      )

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          console.warn(`Instagram user not found: ${username}`)
          return []
        }
        if (userResponse.status === 429) {
          console.error('Instagram API rate limit exceeded')
          return []
        }
        if (userResponse.status === 400) {
          console.warn(`Invalid Instagram user: ${username}`)
          return []
        }
        throw new Error(`Instagram user lookup failed: ${userResponse.status}`)
      }

      const userData = await userResponse.json() as { data?: Array<{ id: string; username: string }> }

      if (!userData.data || userData.data.length === 0) {
        console.warn(`Instagram user not found: ${username}`)
        return []
      }

      const userId = userData.data[0].id

      // Fetch recent media from this user
      const mediaResponse = await fetch(
        `${this.apiUrl}/${userId}/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count&limit=${Math.min(limit, 50)}&access_token=${this.accessToken}`,
        { method: 'GET' }
      )

      if (!mediaResponse.ok) {
        if (mediaResponse.status === 429) {
          console.error('Instagram API rate limit exceeded')
          return []
        }
        throw new Error(`Instagram media fetch failed: ${mediaResponse.status}`)
      }

      const mediaData = await mediaResponse.json() as { data?: InstagramMedia[] }

      if (!mediaData.data) {
        return []
      }

      // Transform media to SocialMediaPostData format
      return mediaData.data.map((media) => ({
        platform: 'instagram' as const,
        post_url: `https://instagram.com/p/${media.id}/`,
        // Sanitize external content to prevent XSS
        post_content: sanitizeHtml(media.caption || `${media.media_type} post`),
        post_date: media.timestamp,
        author_name: sanitizeHtml(username),
        author_handle: sanitizeHtml(username),
        engagement_count: (media.like_count || 0) + (media.comments_count || 0),
        is_recruiting_related: this.isRecruitingRelated(media.caption || ''),
      }))
    } catch (error) {
      console.error(`Error fetching media for ${username}:`, error)
      return []
    }
  }

  /**
   * Fetch media from multiple Instagram handles in parallel
   */
  async fetchMediaForHandles(handles: string[]): Promise<SocialMediaPostData[]> {
    const results = await Promise.all(
      handles.map((handle) => this.getUserMedia(handle))
    )
    return results.flat()
  }

  /**
   * Simple heuristic to detect if post is recruiting-related
   */
  private isRecruitingRelated(caption: string): boolean {
    const recruitingKeywords = [
      'recruit',
      'scholarship',
      'offer',
      'commit',
      'committed',
      'signing day',
      'visit',
      'camp',
      'prospect',
      'elite',
      'ranked',
      'baseball',
    ]
    const lowerCaption = caption.toLowerCase()
    return recruitingKeywords.some((keyword) => lowerCaption.includes(keyword))
  }
}
