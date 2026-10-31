// Run after `npx cap add android` (and after any `npx cap sync`) to apply game-specific Android settings:
// landscape lock, fullscreen immersive theme, hardware acceleration, keep-screen-on.
// Usage: node android-config/apply-android-config.js
const fs = require('fs');
const path = require('path');
const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) { console.error('android/ not found. Run: npx cap add android'); process.exit(1); }
let xml = fs.readFileSync(manifestPath, 'utf8');
if (!xml.includes('android:screenOrientation')) {
  xml = xml.replace(/<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"\n            android:hardwareAccelerated="true"');
}
if (!xml.includes('android.permission.WAKE_LOCK')) {
  xml = xml.replace('</manifest>', '    <uses-permission android:name="android.permission.WAKE_LOCK" />\n</manifest>');
}
fs.writeFileSync(manifestPath, xml);

// Fullscreen theme (hide status/navigation bars)
const stylesPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let st = fs.readFileSync(stylesPath, 'utf8');
  if (!st.includes('android:windowFullscreen')) {
    st = st.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>');
    fs.writeFileSync(stylesPath, st);
  }
}

// Immersive mode + keep screen on in MainActivity
const javaDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'demonacademy', 'game');
const mainActivity = path.join(javaDir, 'MainActivity.java');
if (fs.existsSync(mainActivity)) {
  fs.writeFileSync(mainActivity, `package com.demonacademy.game;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}
`);
}
console.log('Android config applied: landscape, fullscreen, immersive, keep-screen-on.');
