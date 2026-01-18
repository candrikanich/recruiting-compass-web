export const handler = async (event: any) => {
  // Scheduled functions receive POST requests from Netlify
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const siteUrl = process.env.SITE_URL || process.env.URL || 'https://recruiting.chrisandrikanich.com'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'SUPABASE_SERVICE_KEY not configured'
        })
      }
    }

    // Call the existing notification generation endpoint
    const response = await fetch(`${siteUrl}/api/notifications/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Notifications generated successfully',
        results: result
      })
    }
  } catch (error) {
    console.error('Scheduled notification generation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    }
  }
}
