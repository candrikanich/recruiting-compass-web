import { createClient } from '@supabase/supabase-js'

export const handler = async () => {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' })
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')

    if (videosError || !videos) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No videos found' }) }
    }

    let brokenCount = 0
    let checkedCount = 0

    for (const video of videos) {
      try {
        const response = await fetch(video.url, { method: 'HEAD' })
        const isHealthy = response.ok

        await supabase
          .from('videos')
          .update({
            health_status: isHealthy ? 'healthy' : 'broken',
            last_health_check: new Date().toISOString(),
          })
          .eq('id', video.id)

        if (!isHealthy) brokenCount++
        checkedCount++
      } catch (error) {
        await supabase
          .from('videos')
          .update({
            health_status: 'broken',
            last_health_check: new Date().toISOString(),
          })
          .eq('id', video.id)

        brokenCount++
        checkedCount++
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        videosChecked: checkedCount,
        brokenLinks: brokenCount,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: any) {
    console.error('Error in check-video-health function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
