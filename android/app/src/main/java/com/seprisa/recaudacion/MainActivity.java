package com.seprisa.recaudacion;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Habilita edge-to-edge: el WebView ocupa toda la pantalla
        // y env(safe-area-inset-*) reporta los insets reales del sistema
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
