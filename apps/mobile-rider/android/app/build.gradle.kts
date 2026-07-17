import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // google-services plugin removed — placeholder google-services.json
    // caused native Firebase auto-init crash before Flutter engine started.
    // Firebase.initializeApp() in Dart handles init inside a try-catch.
    id("dev.flutter.flutter-gradle-plugin")
}

// Load release signing config from key.properties (gitignored).
// See key.properties.example for the template.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.totalstoreug.mobile_rider"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.totalstoreug.mobile_rider"
        minSdk = flutter.minSdkVersion
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        // Google Maps API key — set GOOGLE_MAPS_API_KEY in android/local.properties
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] =
            (project.findProperty("GOOGLE_MAPS_API_KEY") as String?) ?: "YOUR_GOOGLE_MAPS_API_KEY_HERE"
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKeystore)
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")
            // Minification/shrinking deferred to M4 release-hardening pass.
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
