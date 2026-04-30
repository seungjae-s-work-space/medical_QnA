package net.agisungong.nanimtalktalk

import android.app.Activity
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel

class MainActivity: FlutterActivity(), EventChannel.StreamHandler {
    companion object {
        private const val SCREENSHOT_EVENT_CHANNEL =
            "net.agisungong.nanimtalktalk/screenshot_events"
        private const val SCREENSHOT_THROTTLE_MS = 1000L
        private const val RECENT_SCREENSHOT_WINDOW_SECONDS = 10L
    }

    private var eventSink: EventChannel.EventSink? = null
    private var screenCaptureCallback: Activity.ScreenCaptureCallback? = null
    private var screenshotObserver: ContentObserver? = null
    private var lastScreenshotEventAt = 0L

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            SCREENSHOT_EVENT_CHANNEL
        ).setStreamHandler(this)
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
        registerScreenshotDetection()
    }

    override fun onCancel(arguments: Any?) {
        unregisterScreenshotDetection()
        eventSink = null
    }

    override fun onStop() {
        unregisterScreenshotDetection()
        super.onStop()
    }

    override fun onStart() {
        super.onStart()
        if (eventSink != null) {
            registerScreenshotDetection()
        }
    }

    private fun registerScreenshotDetection() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            registerAndroidScreenCaptureCallback()
        } else {
            registerMediaStoreScreenshotObserver()
        }
    }

    private fun unregisterScreenshotDetection() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            screenCaptureCallback?.let {
                try {
                    unregisterScreenCaptureCallback(it)
                } catch (_: IllegalStateException) {
                    // Already unregistered.
                }
            }
            screenCaptureCallback = null
        }

        screenshotObserver?.let {
            contentResolver.unregisterContentObserver(it)
        }
        screenshotObserver = null
    }

    private fun registerAndroidScreenCaptureCallback() {
        if (screenCaptureCallback != null) return

        val callback = Activity.ScreenCaptureCallback {
            dispatchScreenshotEvent("android_screen_capture_callback")
        }
        screenCaptureCallback = callback
        registerScreenCaptureCallback(mainExecutor, callback)
    }

    private fun registerMediaStoreScreenshotObserver() {
        if (screenshotObserver != null) return

        screenshotObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                if (uri != null && isRecentScreenshot(uri)) {
                    dispatchScreenshotEvent("android_media_store_observer")
                }
            }
        }

        contentResolver.registerContentObserver(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            true,
            screenshotObserver as ContentObserver
        )
    }

    private fun isRecentScreenshot(uri: Uri): Boolean {
        val projection = mutableListOf(
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            projection.add(MediaStore.Images.Media.RELATIVE_PATH)
        } else {
            @Suppress("DEPRECATION")
            projection.add(MediaStore.Images.Media.DATA)
        }

        return try {
            contentResolver.query(uri, projection.toTypedArray(), null, null, null)
                ?.use { cursor ->
                    if (!cursor.moveToFirst()) return false

                    val displayName = cursor.getStringOrEmpty(
                        cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
                    )
                    val dateAdded = cursor.getLongOrZero(
                        cursor.getColumnIndex(MediaStore.Images.Media.DATE_ADDED)
                    )
                    val pathColumn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        MediaStore.Images.Media.RELATIVE_PATH
                    } else {
                        @Suppress("DEPRECATION")
                        MediaStore.Images.Media.DATA
                    }
                    val path = cursor.getStringOrEmpty(cursor.getColumnIndex(pathColumn))
                    val secondsSinceAdded = (System.currentTimeMillis() / 1000L) - dateAdded

                    secondsSinceAdded in 0..RECENT_SCREENSHOT_WINDOW_SECONDS &&
                        looksLikeScreenshot("$displayName $path")
                } ?: false
        } catch (_: SecurityException) {
            false
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    private fun looksLikeScreenshot(value: String): Boolean {
        val normalized = value.lowercase()
        return normalized.contains("screenshot") ||
            normalized.contains("screen_shot") ||
            normalized.contains("screen shot") ||
            normalized.contains("스크린샷")
    }

    private fun dispatchScreenshotEvent(source: String) {
        val now = System.currentTimeMillis()
        if (now - lastScreenshotEventAt < SCREENSHOT_THROTTLE_MS) return
        lastScreenshotEventAt = now

        runOnUiThread {
            eventSink?.success(
                mapOf(
                    "platform" to "android",
                    "source" to source,
                    "timestamp" to now
                )
            )
        }
    }
}

private fun android.database.Cursor.getStringOrEmpty(columnIndex: Int): String {
    return if (columnIndex >= 0 && !isNull(columnIndex)) getString(columnIndex) else ""
}

private fun android.database.Cursor.getLongOrZero(columnIndex: Int): Long {
    return if (columnIndex >= 0 && !isNull(columnIndex)) getLong(columnIndex) else 0L
}
