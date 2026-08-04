// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.4";

// VAPID keys must be set in Supabase Secrets
// supabase secrets set VAPID_PUBLIC_KEY=...
// supabase secrets set VAPID_PRIVATE_KEY=...
// supabase secrets set VAPID_SUBJECT=mailto:info@surumetri.com

serve(async (_req) => {
  try {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Configure Web Push
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@surumetri.com";

    if (!vapidPublic || !vapidPrivate) {
      throw new Error("VAPID keys missing from environment variables.");
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // 3. Find today's tasks
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get incomplete tasks that are due today or earlier
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('id, user_id, metin, priority, kategori, hedefTarih, ciftlikId')
      .eq('yapildiMi', false)
      .in('priority', ['Kritik', 'Önemli'])
      .lte('hedefTarih', todayStr);

    if (todosError) throw todosError;
    if (!todos || todos.length === 0) {
      return new Response(JSON.stringify({ message: "Bugün için acil görev yok." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Group tasks by user_id
    const tasksByUser = todos.reduce((acc: any, task: any) => {
      if (!acc[task.user_id]) acc[task.user_id] = [];
      acc[task.user_id].push(task);
      return acc;
    }, {});

    const userIds = Object.keys(tasksByUser);

    // 4. Get push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subsError) throw subsError;
    if (!subscriptions || subscriptions.length === 0) {
       return new Response(JSON.stringify({ message: "Bildirim izni vermiş kullanıcı bulunamadı." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Send Notifications
    const sendPromises = [];
    for (const sub of subscriptions) {
      const userTasks = tasksByUser[sub.user_id];
      if (!userTasks || userTasks.length === 0) continue;

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh
        }
      };

      const krtikSayisi = userTasks.filter((t: any) => t.priority === 'Kritik').length;
      let title = "Günün Görevleri (SürüMetri)";
      let body = `Bugün yapmanız gereken ${userTasks.length} adet görev var.`;
      
      if (krtikSayisi > 0) {
        title = `🚨 ${krtikSayisi} Kritik Görev Sizi Bekliyor`;
        const kritikTask = userTasks.find((t: any) => t.priority === 'Kritik');
        body = kritikTask.metin + (userTasks.length > 1 ? ` ve ${userTasks.length - 1} görev daha...` : '');
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: "/icons/pwa-192.png",
        url: "/?utm_source=push"
      });

      const promise = webpush.sendNotification(pushSubscription, payload).catch(async (error: any) => {
        console.error(`Error sending push to ${sub.endpoint}:`, error);
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      });
      sendPromises.push(promise);
    }

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, message: `Bildirimler gönderildi (${sendPromises.length})` }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
