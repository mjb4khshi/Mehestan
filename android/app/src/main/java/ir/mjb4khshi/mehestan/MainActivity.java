package ir.mjb4khshi.mehestan;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
