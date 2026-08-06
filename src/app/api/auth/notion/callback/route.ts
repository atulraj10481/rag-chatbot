import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/documents?error=Notion%20connection%20canceled`);
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI || `${origin}/api/auth/notion/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/dashboard/documents?error=Notion%20OAuth%20credentials%20missing`);
  }

  try {
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return NextResponse.redirect(`${origin}/dashboard/documents?error=${encodeURIComponent(errText)}`);
    }

    const tokenData = await tokenResponse.json();
    const supabase = await createClient();

    // Store notion connection
    const { error: dbError } = await supabase
      .from('notion_connections')
      .upsert({
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name || 'Notion Workspace',
        access_token: tokenData.access_token,
        bot_id: tokenData.bot_id,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (dbError) {
      return NextResponse.redirect(`${origin}/dashboard/documents?error=${encodeURIComponent(dbError.message)}`);
    }

    return NextResponse.redirect(`${origin}/dashboard/documents?success=Notion%20connected%20successfully`);
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/dashboard/documents?error=${encodeURIComponent(err.message || 'OAuth error')}`);
  }
}
