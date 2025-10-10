#!/usr/bin/env node

/**
 * Demo script to test NodeCheck Repository Service
 * 
 * This script demonstrates:
 * 1. Fetching repositories from GitHub
 * 2. Analyzing dependencies
 * 3. Viewing repository details
 * 
 * Prerequisites:
 * - The CAP server must be running (cds watch)
 * - GITHUB_TOKEN must be set in .env file
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4004/odata/v4/repository';

async function main() {
  console.log('🚀 NodeCheck Repository Service Demo\n');

  try {
    // 1. Check service availability
    console.log('1️⃣  Checking service availability...');
    const serviceCheck = await axios.get(BASE_URL);
    console.log('   ✅ Service is running');
    console.log('   Available entities:', serviceCheck.data.value.map(e => e.name).join(', '));
    console.log();

    // 2. Fetch repositories from GitHub
    console.log('2️⃣  Fetching repositories from GitHub...');
    console.log('   Note: This requires GITHUB_TOKEN to be set in .env');
    console.log('   You can test this by running:');
    console.log('   curl -X POST http://localhost:4004/odata/v4/repository/fetchRepositories');
    console.log();

    // 3. List current repositories
    console.log('3️⃣  Listing current repositories...');
    const reposResponse = await axios.get(`${BASE_URL}/Repositories`);
    const repos = reposResponse.data.value;
    
    if (repos.length === 0) {
      console.log('   ℹ️  No repositories found. Use fetchRepositories action first.');
    } else {
      console.log(`   Found ${repos.length} repositories:`);
      repos.forEach(repo => {
        console.log(`   - ${repo.fullName} (${repo.status || 'not analyzed'})`);
      });
    }
    console.log();

    // 4. Show example analysis
    if (repos.length > 0) {
      console.log('4️⃣  To analyze repositories, use:');
      console.log(`   POST ${BASE_URL}/analyzeRepositories`);
      console.log('   Body: { "repositoryIds": ["${repositoryId}"] }');
      console.log();

      // Show dependencies for first repository
      const firstRepo = repos[0];
      const depsResponse = await axios.get(
        `${BASE_URL}/Repositories(${firstRepo.ID})?$expand=dependencies,auditResults`
      );
      const repoWithDeps = depsResponse.data;
      
      console.log(`   Dependencies for ${repoWithDeps.fullName}:`);
      if (repoWithDeps.dependencies && repoWithDeps.dependencies.length > 0) {
        repoWithDeps.dependencies.forEach(dep => {
          console.log(`   - ${dep.packageName}: ${dep.currentVersion} → ${dep.recommendedVersion}`);
        });
      } else {
        console.log('   ℹ️  No dependencies analyzed yet.');
      }
    }

    console.log('\n✨ Demo completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Set GITHUB_TOKEN in .env file');
    console.log('   2. Call fetchRepositories action to load your repos');
    console.log('   3. Call analyzeRepositories to scan dependencies');
    console.log('   4. View results in Fiori UI at http://localhost:4004/');
    console.log('   5. Use upgradePackages to create automated commits');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
