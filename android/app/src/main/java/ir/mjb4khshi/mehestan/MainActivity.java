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

import java.io.File;
import java.io.FileOutputStream;

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
                        intent.setPackage("ir.mjb4khshi.sarvestan.kntu");
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        try {
                            Intent genericIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUrl));
                            genericIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(genericIntent);
                            return true;
                        } catch (Exception e2) {
                            try {
                                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://mjb4khshi.github.io/sarvestan"));
                                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(webIntent);
                            } catch (Exception ignored) {}
                            return false;
                        }
                    }
                }
            }, "SarvestanLauncher");

            // رابط نیتیو رسمی اعلان‌های سیستمی و مدیریت فایل‌های اندروید
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

                @JavascriptInterface
                public boolean exportCalendar(String icsContent, String filename) {
                    try {
                        Context ctx = MainActivity.this;
                        File cacheDir = new File(ctx.getCacheDir(), "exported_calendars");
                        if (!cacheDir.exists()) cacheDir.mkdirs();
                        File icsFile = new File(cacheDir, filename != null && !filename.isEmpty() ? filename : "mehestan_deadlines.ics");
                        try (FileOutputStream fos = new FileOutputStream(icsFile)) {
                            fos.write(icsContent.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                            fos.flush();
                        }
                        Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                            ctx,
                            ctx.getPackageName() + ".fileprovider",
                            icsFile
                        );

                        try {
                            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                            viewIntent.setDataAndType(contentUri, "text/calendar");
                            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                            Intent chooser = Intent.createChooser(viewIntent, "افزودن به تقویم گوشی");
                            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                            return true;
                        } catch (android.content.ActivityNotFoundException anf) {
                            Intent shareIntent = new Intent(Intent.ACTION_SEND);
                            shareIntent.setType("text/calendar");
                            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "تقویم موعد تکالیف مهستان");
                            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                            Intent chooser = Intent.createChooser(shareIntent, "خروجی تقویم و ددلاین‌ها");
                            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                            return true;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    }
                }

                @JavascriptInterface
                public boolean openFileWithApp(String base64Content, String filename, String mimeType) {
                    try {
                        Context ctx = MainActivity.this;
                        File cacheDir = new File(ctx.getCacheDir(), "shared_docs");
                        if (!cacheDir.exists()) cacheDir.mkdirs();
                        File docFile = new File(cacheDir, filename != null && !filename.isEmpty() ? filename : "document.pdf");
                        byte[] bytes = android.util.Base64.decode(base64Content, android.util.Base64.DEFAULT);
                        try (FileOutputStream fos = new FileOutputStream(docFile)) {
                            fos.write(bytes);
                            fos.flush();
                        }
                        Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                            ctx,
                            ctx.getPackageName() + ".fileprovider",
                            docFile
                        );

                        Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                        viewIntent.setDataAndType(contentUri, mimeType != null && !mimeType.isEmpty() ? mimeType : "application/pdf");
                        viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                        Intent chooser = Intent.createChooser(viewIntent, "باز کردن با برنامه");
                        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(chooser);
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    }
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
