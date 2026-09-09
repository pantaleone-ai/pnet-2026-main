#!/usr/bin/env tsx

/**
 * Analytics Validation Script
 * Validates the e-commerce analytics implementation setup
 */

import { getProducts } from '../features/shop/data/shopSource';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class AnalyticsValidator {
  private results: ValidationResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Analytics Validation...\n');

    await this.testProductDataStructure();
    await this.testAnalyticsFilesExist();
    await this.testEnvironmentVariables();
    await this.testStripeWebhookStructure();

    this.printResults();
  }

  private async testProductDataStructure(): Promise<void> {
    console.log('📊 Testing Product Data Structure...');

    const products = getProducts();
    const requiredFields = ['id', 'title', 'category', 'price'];

    for (const product of products.slice(0, 3)) { // Test first 3 products
      const missingFields = requiredFields.filter(field => !(field in product));

      this.results.push({
        test: `Product ${product.id} data structure`,
        passed: missingFields.length === 0,
        message: missingFields.length === 0
          ? 'All required fields present'
          : `Missing fields: ${missingFields.join(', ')}`,
        details: { product, missingFields }
      });
    }
  }

  private async testAnalyticsFilesExist(): Promise<void> {
    console.log('📁 Testing Analytics Files...');

    const requiredFiles = [
      'lib/analytics.ts',
      'app/api/stripe/webhooks/route.ts',
      'features/shop/components/ProductDetailClient.tsx',
      'features/shop/components/FeaturedProductsSection.tsx',
      'features/blog/components/BlogPostList.tsx',
      'features/blog/components/BlogPostAnalytics.tsx',
      'app/(app)/(root)/blog/[slug]/page.tsx',
      'components/header/shared/SearchButton.tsx',
      'actions/search.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);

      this.results.push({
        test: `Analytics file: ${file}`,
        passed: exists,
        message: exists ? 'File exists' : 'File missing',
        details: { path: filePath }
      });
    }
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log('🔧 Testing Environment Variables...');

    const requiredEnvVars = [
      'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
      'NEXT_PUBLIC_META_PIXEL_ID',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'STRIPE_SECRET_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      const isSet = !!process.env[envVar];

      this.results.push({
        test: `Environment variable: ${envVar}`,
        passed: isSet,
        message: isSet ? 'Variable is set' : 'Variable not set (optional for development)',
        details: { optional: !isSet }
      });
    }
  }

  private async testStripeWebhookStructure(): Promise<void> {
    console.log('💳 Testing Stripe Webhook Structure...');

    const webhookFile = path.join(process.cwd(), 'app/api/stripe/webhooks/route.ts');
    const exists = fs.existsSync(webhookFile);

    if (exists) {
      const content = fs.readFileSync(webhookFile, 'utf-8');

      // Check for required webhook event handlers
      const hasCheckoutCompleted = content.includes('checkout.session.completed');
      const hasPurchaseTracking = content.includes('track.purchase');
      const hasErrorHandling = content.includes('webhook signature');

      this.results.push({
        test: 'Stripe webhook checkout handler',
        passed: hasCheckoutCompleted,
        message: hasCheckoutCompleted ? 'Checkout completion handler found' : 'Missing checkout completion handler'
      });

      this.results.push({
        test: 'Stripe webhook purchase tracking',
        passed: hasPurchaseTracking,
        message: hasPurchaseTracking ? 'Purchase tracking implemented' : 'Missing purchase tracking'
      });

      this.results.push({
        test: 'Stripe webhook security',
        passed: hasErrorHandling,
        message: hasErrorHandling ? 'Webhook signature verification implemented' : 'Missing webhook security'
      });
    } else {
      this.results.push({
        test: 'Stripe webhook file',
        passed: false,
        message: 'Webhook file does not exist'
      });
    }
  }

  private printResults(): void {
    console.log('\n📋 Validation Results:\n');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });

    console.log(`\n🎯 Summary: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('🎉 All analytics validations passed!');
      console.log('\n📝 Next Steps:');
      console.log('1. Set up Stripe webhook endpoint in Stripe Dashboard');
      console.log('2. Configure Google Analytics 4 e-commerce tracking');
      console.log('3. Test analytics events in browser developer tools');
      console.log('4. Monitor conversion funnels in analytics dashboards');
    } else {
      console.log('⚠️  Some validations failed. Please review the errors above.');
      console.log('\n🔧 Common Fixes:');
      console.log('- Run "npm install" to ensure all dependencies are installed');
      console.log('- Copy .env.template to .env.local and fill in analytics keys');
      console.log('- Check that all analytics files were created correctly');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AnalyticsValidator();
  validator.runAllTests().catch(console.error);
}

export { AnalyticsValidator };
