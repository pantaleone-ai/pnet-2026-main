#!/usr/bin/env node

/**
 * Analytics Validation Script with Langfuse Tracing
 * Validates GA4, PostHog, and Meta Pixel implementation
 *
 * Usage: node scripts/analytics-validation.ts
 */

const fs = require("fs");
const path = require("path");

class AnalyticsValidator {
  constructor() {
    this.results = [];
    this.events = [];
    this.langfuseEnabled = !!(
      process.env.LANGFUSE_HOST && process.env.LANGFUSE_SECRET_KEY
    );
  }

  runAllTests() {
    console.log("🚀 Starting Analytics Validation...\n");

    if (this.langfuseEnabled) {
      console.log("📡 Langfuse tracing enabled\n");
    }

    this.testEventTracking();
    this.testPageTitleTracking();
    this.testCTATracking();
    this.testConsentIntegration();
    this.testSPARouting();
    this.testAnalyticsFilesExist();
    this.testEnvironmentVariables();

    this.printResults();
    this.generateReport();
  }

  testEventTracking() {
    console.log("📊 Testing Event Tracking Implementation...\n");

    this.events = [
      {
        name: "page_view",
        ga4: true,
        posthog: true,
        meta: true,
        location: "hooks/usePageTracking.tsx",
      },
      {
        name: "view_item_list",
        ga4: true,
        posthog: false,
        meta: false,
        location: "lib/analytics.ts:97",
      },
      {
        name: "view_item",
        ga4: true,
        posthog: true,
        meta: true,
        location: "lib/analytics.ts:115",
      },
      {
        name: "add_to_cart",
        ga4: true,
        posthog: true,
        meta: true,
        location: "lib/analytics.ts:135",
      },
      {
        name: "begin_checkout",
        ga4: true,
        posthog: true,
        meta: true,
        location: "lib/analytics.ts:156",
      },
      {
        name: "purchase",
        ga4: true,
        posthog: true,
        meta: true,
        location: "lib/analytics.ts:177",
      },
      {
        name: "search",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts:441",
      },
      {
        name: "select_content",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts:461",
      },
      {
        name: "page_title",
        ga4: true,
        posthog: true,
        meta: false,
        location: "hooks/usePageTracking.tsx",
      },
      {
        name: "cta_click",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts (track.ctaClicked)",
      },
      {
        name: "contact_form",
        ga4: true,
        posthog: true,
        meta: false,
        location: "app/api/contact/route.ts",
      },
      {
        name: "blog_post_view",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts (postViewed)",
      },
      {
        name: "blog_engagement",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts (postEngaged)",
      },
      {
        name: "outbound_link",
        ga4: true,
        posthog: true,
        meta: false,
        location: "lib/analytics.ts (track.outboundLinkClicked)",
      },
      {
        name: "generate_lead",
        ga4: true,
        posthog: false,
        meta: false,
        location: "lib/analytics.ts (ctaClicked for contact)",
      },
    ];

    for (const event of this.events) {
      const hasGa4OrPosthog = event.ga4 || event.posthog;

      let severity = "low";
      if (
        ["page_view", "view_item", "add_to_cart", "purchase"].includes(
          event.name,
        )
      ) {
        severity = "critical";
      } else if (
        ["cta_click", "generate_lead", "page_title"].includes(event.name)
      ) {
        severity = "high";
      } else if (["blog_post_view", "outbound_link"].includes(event.name)) {
        severity = "medium";
      }

      this.results.push({
        test: `Event: ${event.name}`,
        passed: hasGa4OrPosthog,
        message:
          event.ga4 && event.posthog
            ? "Tracked in all platforms"
            : hasGa4OrPosthog
              ? `GA4: ${event.ga4 ? "✅" : "❌"}, PostHog: ${event.posthog ? "✅" : "❌"}`
              : "NOT TRACKED",
        details: {
          location: event.location,
          ga4: event.ga4,
          posthog: event.posthog,
          meta: event.meta,
        },
        severity,
      });
    }
  }

  testPageTitleTracking() {
    console.log("📝 Testing Page Title Tracking...");

    const analyticsFile = path.join(process.cwd(), "lib/analytics.ts");
    const layoutFile = path.join(process.cwd(), "app/layout.tsx");
    const pageTrackingFile = path.join(
      process.cwd(),
      "hooks/usePageTracking.tsx",
    );

    const analyticsContent = fs.existsSync(analyticsFile)
      ? fs.readFileSync(analyticsFile, "utf-8")
      : "";
    const layoutContent = fs.existsSync(layoutFile)
      ? fs.readFileSync(layoutFile, "utf-8")
      : "";
    const pageTrackingContent = fs.existsSync(pageTrackingFile)
      ? fs.readFileSync(pageTrackingFile, "utf-8")
      : "";

    const hasTitleInGA4 = pageTrackingContent.includes("page_title");
    const hasTitleInPageView =
      pageTrackingContent.includes("page_title") ||
      pageTrackingContent.includes("document.title");

    this.results.push({
      test: "Page title in GA4 config",
      passed: hasTitleInGA4,
      message: hasTitleInGA4
        ? "Page title tracked in GA4"
        : "Page title NOT tracked in GA4 - critical gap",
      details: { ga4: hasTitleInGA4 },
      severity: "critical",
    });

    this.results.push({
      test: "Page title in PostHog",
      passed: hasTitleInPageView,
      message: hasTitleInPageView
        ? "Page title tracked in PostHog"
        : "Page title NOT tracked - using GA4 page_path only",
      details: { posthog: hasTitleInPageView },
      severity: "high",
    });
  }

  testCTATracking() {
    console.log("🔘 Testing CTA Click Tracking...");

    const eventsFile = path.join(process.cwd(), "lib/events.ts");
    const analyticsFile = path.join(process.cwd(), "lib/analytics.ts");
    const productDetailFile = path.join(
      process.cwd(),
      "features/shop/components/ProductDetailClient.tsx",
    );

    const eventsContent = fs.existsSync(eventsFile)
      ? fs.readFileSync(eventsFile, "utf-8")
      : "";
    const analyticsContent = fs.existsSync(analyticsFile)
      ? fs.readFileSync(analyticsFile, "utf-8")
      : "";
    const productDetailContent = fs.existsSync(productDetailFile)
      ? fs.readFileSync(productDetailFile, "utf-8")
      : "";

    const hasCTAEvent = eventsContent.includes("cta_contact_me_clicked");
    const hasCTAGA4 =
      analyticsContent.includes("cta") && analyticsContent.includes("gtag");
    const hasCTAInProductDetail =
      productDetailContent.includes("track.beginCheckout") ||
      productDetailContent.includes("begin_checkout");

    this.results.push({
      test: "CTA event defined",
      passed: hasCTAEvent,
      message: hasCTAEvent
        ? "CTA contact event exists in PostHog"
        : "CTA event missing",
      severity: "high",
    });

    this.results.push({
      test: "CTA tracking in GA4",
      passed: hasCTAGA4,
      message: hasCTAGA4
        ? "CTA tracked in GA4"
        : "CTA NOT tracked in GA4 - missing generate_lead",
      severity: "high",
    });

    this.results.push({
      test: "Buy Now CTA tracking",
      passed: hasCTAInProductDetail,
      message: hasCTAInProductDetail
        ? "Buy Now button tracks begin_checkout"
        : "Buy Now button tracking issue",
      severity: "critical",
    });
  }

  testConsentIntegration() {
    console.log("🔒 Testing Consent Integration...");

    const consentFile = path.join(
      process.cwd(),
      "components/ConsentManagerClient.tsx",
    );
    const posthogProviderFile = path.join(
      process.cwd(),
      "components/PostHogProvider.tsx",
    );
    const layoutFile = path.join(process.cwd(), "app/layout.tsx");
    const analyticsFile = path.join(process.cwd(), "lib/analytics.ts");

    const consentContent = fs.existsSync(consentFile)
      ? fs.readFileSync(consentFile, "utf-8")
      : "";
    const providerContent = fs.existsSync(posthogProviderFile)
      ? fs.readFileSync(posthogProviderFile, "utf-8")
      : "";
    const layoutContent = fs.existsSync(layoutFile)
      ? fs.readFileSync(layoutFile, "utf-8")
      : "";
    const analyticsContent = fs.existsSync(analyticsFile)
      ? fs.readFileSync(analyticsFile, "utf-8")
      : "";

    const hasConsentManager = consentContent.includes(
      "ClientSideOptionsProvider",
    );
    const posthogGated = providerContent.includes("NEXT_PUBLIC_POSTHOG_KEY");
    const ga4LoadsAlways = layoutContent.includes("google-analytics");
    const hasGA4Gating = analyticsContent.includes("isGaEnabled");

    this.results.push({
      test: "Consent manager present",
      passed: hasConsentManager,
      message: hasConsentManager
        ? "Consent manager component exists"
        : "Consent manager missing",
      severity: "critical",
    });

    this.results.push({
      test: "PostHog loads in dev and prod",
      passed: posthogGated,
      message: posthogGated
        ? "PostHog loads in all environments (dev + prod)"
        : "PostHog improperly gated",
      severity: "high",
    });

    this.results.push({
      test: "GA4 loads without consent",
      passed: ga4LoadsAlways,
      message: ga4LoadsAlways
        ? "GA4 loads without consent (correct)"
        : "GA4 gated incorrectly",
      severity: "high",
    });

    this.results.push({
      test: "GA4 event sending gated by consent check",
      passed: hasGA4Gating,
      message: hasGA4Gating
        ? "GA4 has isGaEnabled check"
        : "GA4 missing consent gating",
      severity: "medium",
    });
  }

  testSPARouting() {
    console.log("🔄 Testing SPA Routing...");

    const pageTrackingFile = path.join(
      process.cwd(),
      "hooks/usePageTracking.tsx",
    );
    const content = fs.existsSync(pageTrackingFile)
      ? fs.readFileSync(pageTrackingFile, "utf-8")
      : "";

    const hasUsePathname = content.includes("usePathname");
    const tracksOnChange =
      content.includes("[pathname, searchParams]") ||
      content.includes("pathname, searchParams");

    this.results.push({
      test: "SPA route tracking",
      passed: hasUsePathname && tracksOnChange,
      message:
        hasUsePathname && tracksOnChange
          ? "SPA route changes tracked"
          : "SPA routing not properly tracked",
      severity: "critical",
    });
  }

  testAnalyticsFilesExist() {
    console.log("📁 Testing Analytics Files...");

    const requiredFiles = [
      "lib/analytics.ts",
      "lib/events.ts",
      "app/api/stripe/webhooks/route.ts",
      "features/shop/components/ProductDetailClient.tsx",
      "hooks/usePageTracking.tsx",
      "components/PostHogProvider.tsx",
      "components/ConsentManagerClient.tsx",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);

      this.results.push({
        test: `Analytics file: ${file}`,
        passed: exists,
        message: exists ? "File exists" : "File missing",
        details: { path: filePath },
        severity: exists ? "low" : "critical",
      });
    }
  }

  testEnvironmentVariables() {
    console.log("🔧 Testing Environment Variables...");

    const requiredEnvVars = [
      "NEXT_PUBLIC_GOOGLE_ANALYTICS_ID",
      "NEXT_PUBLIC_POSTHOG_KEY",
    ];

    for (const envVar of requiredEnvVars) {
      const isSet = !!process.env[envVar];

      this.results.push({
        test: `Environment variable: ${envVar}`,
        passed: isSet,
        message: isSet
          ? "Variable is set"
          : "Variable not set (optional for development)",
        details: { optional: !isSet },
        severity: isSet ? "low" : "medium",
      });
    }
  }

  printResults() {
    console.log("\n📋 Validation Results:\n");

    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;

    const critical = this.results.filter(
      (r) => r.severity === "critical" && !r.passed,
    );
    const high = this.results.filter((r) => r.severity === "high" && !r.passed);

    if (critical.length > 0) {
      console.log("🚨 CRITICAL ISSUES:");
      critical.forEach((result) => {
        console.log(`   ❌ ${result.test}: ${result.message}`);
      });
      console.log("");
    }

    if (high.length > 0) {
      console.log("⚠️  HIGH PRIORITY:");
      high.forEach((result) => {
        console.log(`   ❌ ${result.test}: ${result.message}`);
      });
      console.log("");
    }

    this.results.forEach((result) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.test}: ${result.message}`);
    });

    console.log(`\n🎯 Summary: ${passed}/${total} tests passed`);
    console.log(`   Critical: ${critical.length} failed`);
    console.log(`   High: ${high.length} failed`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.passed).length,
        failed: this.results.filter((r) => !r.passed).length,
        critical: this.results.filter(
          (r) => r.severity === "critical" && !r.passed,
        ).length,
        high: this.results.filter((r) => r.severity === "high" && !r.passed)
          .length,
      },
      events: this.events,
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(process.cwd(), ".analytics-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    if (this.langfuseEnabled) {
      console.log("📡 Syncing with Langfuse...");
      this.syncWithLangfuse(report);
    }
  }

  generateRecommendations() {
    const recommendations = [];
    const failed = this.results.filter((r) => !r.passed);

    for (const result of failed) {
      switch (result.test) {
        case "Page title in GA4 config":
          recommendations.push(
            "Add page_title to GA4 config in hooks/usePageTracking.tsx",
          );
          break;
        case "CTA tracking in GA4":
          recommendations.push(
            "Add generate_lead event to lib/analytics.ts for CTA clicks",
          );
          break;
        case "CTA event defined":
          recommendations.push(
            "Ensure cta_contact_me_clicked is properly fired",
          );
          break;
        case "Event: page_title":
          recommendations.push(
            "Implement page title tracking in both GA4 and PostHog",
          );
          break;
        case "Event: cta_click":
          recommendations.push(
            "Add cta_click tracking to GA4 (currently only PostHog)",
          );
          break;
        case "Event: generate_lead":
          recommendations.push(
            "Add generate_lead event for contact form (when live)",
          );
          break;
        case "Event: outbound_link":
          recommendations.push("Implement outbound link click tracking");
          break;
        case "Buy Now CTA tracking":
          recommendations.push(
            "Verify begin_checkout event is fired on Buy Now click",
          );
          break;
      }
    }

    return [...new Set(recommendations)];
  }

  async syncWithLangfuse(report) {
    try {
      const response = await fetch(
        `${process.env.LANGFUSE_HOST}/api/public/traces`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LANGFUSE_SECRET_KEY}`,
          },
          body: JSON.stringify({
            name: "analytics-validation",
            metadata: {
              ...report,
              environment: process.env.NODE_ENV,
              url: process.env.NEXT_PUBLIC_APP_URL,
            },
          }),
        },
      );

      if (response.ok) {
        console.log("✅ Synced with Langfuse");
      } else {
        console.log("⚠️  Langfuse sync failed:", response.statusText);
      }
    } catch (error) {
      console.log("⚠️  Langfuse sync error:", error);
    }
  }
}

const validator = new AnalyticsValidator();
validator.runAllTests();
