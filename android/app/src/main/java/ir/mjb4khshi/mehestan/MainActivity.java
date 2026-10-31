package ir.mjb4khshi.mehestan;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "mehestan_moodle_channel";
    private static final int NOTIF_REQ_CODE = 4051;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        createNotificationChannel();
        requestNotificationPermissionIfNeeded();

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // رابط نیتیو امن برای انتقال مستقیم دیتا و باز کردن اپلیکیشن سروستان
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public boolean openSarvestan(String deepLinkUrl) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUrl));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        try {
                            Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://mjb4khshi.github.io/sarvestan"));
                            webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(webIntent);
                        } catch (Exception ignored) {}
                        return false;
                    }
                }
            }, "SarvestanLauncher");

            // رابط نیتیو رسمی اعلان‌های سیستمی اندروید
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public boolean showNotification(String title, String body, int notifId) {
                    return sendSystemNotification(title, body, notifId);
                }

                @JavascriptInterface
                public boolean requestPermission() {
                    requestNotificationPermissionIfNeeded();
                    return true;
                }

                @JavascriptInterface
                public boolean isSupported() {
                    return true;
                }
            }, "NativeNotifier");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "اعلان‌های مودل مهستان",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("اطلاعیه‌ها، پیام‌ها و نمرات سامانه مودل");
            channel.enableVibration(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIF_REQ_CODE);
            }
        }
    }

    private boolean sendSystemNotification(String title, String body, int notifId) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return false;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

            nm.notify(notifId > 0 ? notifId : (int) System.currentTimeMillis(), builder.build());
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        forceWebViewLayout();
    }

    @Override
    public void onResume() {
        super.onResume();
        forceWebViewLayout();
    }

    private void forceWebViewLayout() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().requestLayout();
                    getBridge().getWebView().invalidate();
                }
            });
        }
    }
}
