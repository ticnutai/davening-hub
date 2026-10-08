package com.ticnutai.newshul;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.util.Collections;

/** Dedicated offline shell. Never loads the original site or a remote document. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://new-shul.local";
    private static final int PICK = 40, SAVE = 41;
    private WebView web;
    private LinearLayout bar;
    private ValueCallback<Uri[]> picker;
    private byte[] pendingFile;
    private boolean display;
    private boolean restoringBar;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff11273f);
        root.setOnApplyWindowInsetsListener((v, insets) -> { v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); return insets; });
        bar = new LinearLayout(this); bar.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        addButton("עריכה", () -> showBoard(false));
        addButton("הלוח השמור", () -> showBoard(true));
        addButton("מסך מלא", () -> { setFullscreen(true); web.requestFocus(); });
        TextView name = new TextView(this); name.setText("New Shul " + BuildConfig.VERSION_NAME + " · מקומי"); name.setTextColor(0xffe7cc90); name.setGravity(17);
        bar.addView(name, new LinearLayout.LayoutParams(0, -1, 1)); root.addView(bar, new LinearLayout.LayoutParams(-1, dp(48)));
        web = new WebView(this); root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
        WebSettings s = web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(true); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false); s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(true); s.setUseWideViewPort(true); s.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new FileBridge(), "NewShulAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !local(r.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (!local(r.getUrl())) return error(403, "External access disabled");
                String path = r.getUrl().getPath(); if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\")) return error(403, "Invalid path");
                try { return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-cache"), getAssets().open("www" + path)); }
                catch (IOException e) { return error(404, "Asset not found"); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (picker != null) picker.onReceiveValue(null); picker = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                String[] accepts = params.getAcceptTypes();
                // Extension-only filters such as .zip aren't Android MIME types.
                if (accepts.length > 0 && accepts[0].contains("/")) intent.putExtra(Intent.EXTRA_MIME_TYPES, accepts);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, PICK); }
                catch (android.content.ActivityNotFoundException e) { picker.onReceiveValue(null); picker = null; toast("לא נמצא בורר קבצים במכשיר"); }
                return true;
            }
            @Override public boolean onJsBeforeUnload(WebView v, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage("יש שינויים שלא נשמרו. לעבור מסך?")
                    .setPositiveButton("מעבר", (d,w) -> result.confirm()).setNegativeButton("המשך עריכה", (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show(); return true;
            }
        });
        display = getPreferences(0).getBoolean("display", false);
        if (state == null || web.restoreState(state) == null) web.loadUrl(ORIGIN + "/new-shul.html" + (display ? "?display=1" : ""));
    }
    private static boolean local(Uri uri) { return "https".equals(uri.getScheme()) && "new-shul.local".equals(uri.getHost()); }
    private static WebResourceResponse error(int code, String message) { return new WebResourceResponse("text/plain", "UTF-8", code, message, Collections.emptyMap(), new ByteArrayInputStream(message.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
    private static String mime(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".woff2")) return "font/woff2";
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext); return type == null ? "application/octet-stream" : type;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void addButton(String title, Runnable action) { Button b = new Button(this); b.setText(title); b.setTextSize(13); b.setOnClickListener(v -> action.run()); bar.addView(b); }
    private void showBoard(boolean value) { display = value; getPreferences(0).edit().putBoolean("display", value).apply(); web.loadUrl(ORIGIN + "/new-shul.html" + (value ? "?display=1" : "")); }
    private void toast(String text) { runOnUiThread(() -> Toast.makeText(this, text, Toast.LENGTH_LONG).show()); }
    private void setFullscreen(boolean enabled) {
        bar.setVisibility(enabled ? View.GONE : View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(enabled
            ? View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            : View.SYSTEM_UI_FLAG_VISIBLE);
        if (!enabled) bar.getChildAt(0).requestFocus();
    }
    @Override public boolean onKeyDown(int key, KeyEvent event) {
        if (key == KeyEvent.KEYCODE_MENU || key == KeyEvent.KEYCODE_BACK && bar.getVisibility() == View.GONE) {
            setFullscreen(false); return true;
        }
        return super.onKeyDown(key,event);
    }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && (bar.getVisibility() == View.GONE || restoringBar)) {
            restoringBar = event.getAction() != KeyEvent.ACTION_UP;
            if (event.getAction() == KeyEvent.ACTION_UP) setFullscreen(false);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
    @Override public void onBackPressed() {
        if (bar.getVisibility() == View.GONE) { setFullscreen(false); }
        else if (display) showBoard(false);
        else new AlertDialog.Builder(this).setMessage("לצאת מ־New Shul? ודאו ששמרתם את העריכה.").setPositiveButton("יציאה", (d,w) -> finish()).setNegativeButton("ביטול",null).show();
    }
    @Override public void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() { if (picker != null) picker.onReceiveValue(null); pendingFile = null; web.removeJavascriptInterface("NewShulAndroid"); web.destroy(); super.onDestroy(); }

    public final class FileBridge {
        @JavascriptInterface public void saveFile(String name, String type, String payload) {
            if (payload == null || payload.length() > 45_000_000) { toast("הקובץ גדול מדי לייצוא"); return; }
            final byte[] bytes;
            try { bytes = Base64.decode(payload, Base64.DEFAULT); } catch (IllegalArgumentException e) { toast("קובץ הייצוא אינו תקין"); return; }
            runOnUiThread(() -> {
                if (pendingFile != null) { toast("סיימו קודם את שמירת הקובץ הקודם"); return; }
                pendingFile = bytes;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(type == null || type.isEmpty() ? "application/octet-stream" : type)
                    .putExtra(Intent.EXTRA_TITLE, name == null ? "new-shul" : name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                try { startActivityForResult(intent, SAVE); }
                catch (android.content.ActivityNotFoundException e) { pendingFile = null; toast("לא נמצא בורר קבצים במכשיר"); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent intent) {
        super.onActivityResult(request, result, intent);
        if (request == PICK && picker != null) {
            Uri[] uris = null;
            if (result == RESULT_OK && intent != null) {
                if (intent.getClipData() != null) { uris = new Uri[intent.getClipData().getItemCount()]; for (int i=0;i<uris.length;i++) uris[i] = intent.getClipData().getItemAt(i).getUri(); }
                else if (intent.getData() != null) uris = new Uri[]{intent.getData()};
            }
            picker.onReceiveValue(uris); picker = null;
        }
        if (request == SAVE) {
            byte[] bytes = pendingFile; pendingFile = null;
            if (result != RESULT_OK || intent == null || intent.getData() == null || bytes == null) { toast("השמירה בוטלה"); return; }
            Uri uri = intent.getData();
            new Thread(() -> { try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new IOException(); out.write(bytes); toast("הקובץ נשמר");
            } catch (IOException e) { toast("שמירת הקובץ נכשלה. נסו מיקום אחר"); } }, "new-shul-export").start();
        }
    }
}
