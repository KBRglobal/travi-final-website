// Script to download category images from Google Drive
// Run with: npx tsx scripts/download-gdrive-images.ts

import { findFolderByName, listFilesInFolder, listFolders, downloadFile } from '../server/google-drive';
import * as fs from 'fs';
import * as path from 'path';

const DESTINATIONS_DIR = 'client/public/images/destinations';

// Map of expected filenames from SEO package
const EXPECTED_FILES: Record<string, string[]> = {
  'amsterdam': [
    'amsterdam-canal-dining-dutch-pancakes-breakfast.webp',
    'amsterdam-museums-anne-frank-house-rijksmuseum.webp', 
    'amsterdam-cycling-canal-flower-market-colorful-flags.webp'
  ],
  'bangkok': [
    'bangkok-wat-arun-temple-chao-phraya-river-longtail-boat.webp',
    'bangkok-street-food-market-noodles-neon-signs.webp',
    'bangkok-grand-palace-golden-stupa-monks-temple.webp'
  ],
  'barcelona': [
    'barcelona-sagrada-familia-park-guell-gaudi-architecture.webp',
    'barcelona-paella-seafood-colorful-buildings-terrace.webp',
    'barcelona-casa-batllo-gaudi-mosaic-facade-passeig-de-gracia.webp'
  ],
  'dubai': [
    'dubai-old-town-wind-towers-colorful-traditional-architecture.webp',
    'dubai-arabic-breakfast-burj-khalifa-view-rooftop-terrace.webp',
    'dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp'
  ],
  'hong-kong': [
    'hong-kong-tian-tan-buddha-victoria-harbour-star-ferry-skyline.webp',
    'hong-kong-dim-sum-traditional-bamboo-steamers-tea-house.webp',
    'hong-kong-temple-incense-colorful-flags-street-market.webp',
    'hong-kong-central-district-skyscrapers-traditional-shophouses-neon-signs.webp'
  ],
  'istanbul': [
    'istanbul-hagia-sophia-bosphorus-bridge-sultanahmet-sunset.webp',
    'istanbul-turkish-desserts-pastry-shops-colorful-architecture.webp',
    'istanbul-spice-bazaar-mosque-colorful-textiles-sunset.webp'
  ],
  'las-vegas': [
    'las-vegas-strip-stratosphere-tower-welcome-sign-neon-lights.webp',
    'las-vegas-fremont-street-casinos-neon-signs-street-performers.webp',
    'las-vegas-buffet-casino-strip-view-all-you-can-eat.webp'
  ],
  'london': [
    'london-buckingham-palace-changing-guard-ceremony-colorful.webp',
    'london-notting-hill-colorful-houses-cafe-street-scene.webp',
    'london-afternoon-tea-big-ben-view-scones-pastries.webp'
  ],
  'los-angeles': [
    'los-angeles-hollywood-sign-griffith-observatory-downtown-skyline-sunset.webp',
    'los-angeles-venice-beach-street-art-murals-food-trucks-skateboarders.webp',
    'los-angeles-rooftop-dining-downtown-skyline-neon-fine-dining.webp'
  ],
  'miami': [
    'miami-art-deco-ocean-drive-rooftop-dining-burger-mojito.webp',
    'miami-south-beach-art-deco-district-colorful-buildings-sunset.webp',
    'miami-ocean-drive-art-deco-buildings-street-art-palm-trees.webp'
  ],
  'new-york': [
    'new-york-colorful-buildings-street-food-carts-neon-signs-dusk.webp',
    'new-york-statue-of-liberty-empire-state-building-manhattan-skyline.webp',
    'new-york-soho-colorful-architecture-yellow-cabs-street-vendors.webp'
  ],
  'paris': [
    'paris-eiffel-tower-louvre-pyramid-trocadero-gardens-sunset.webp',
    'paris-cafe-croissants-coffee-traditional-bistro-street-scene.webp',
    'paris-fashion-boutique-colorful-window-display-shopping-street.webp'
  ],
  'rome': [
    'rome-colorful-buildings-pasta-outdoor-dining-church-bell-tower.webp',
    'rome-colorful-street-cobblestone-outdoor-cafes-dome-church.webp',
    'rome-trevi-fountain-baroque-sculpture-crowded-landmark.webp'
  ],
  'singapore': [
    'singapore-marina-bay-sands-gardens-by-the-bay-supertrees-sunset.webp',
    'singapore-hawker-center-street-food-stalls-colorful-outdoor-dining.webp',
    'singapore-esplanade-waterfront-skyline-cultural-performers-sunset.webp'
  ],
  'tokyo': [
    'tokyo-tsutenkaku-tower-shinsekai-neon-signs-kimono-street-scene.webp',
    'tokyo-sushi-chef-preparing-nigiri-pagoda-view-authentic-restaurant.webp',
    'tokyo-torii-gate-pagoda-sensoji-temple-lanterns-traditional-market.webp'
  ],
  'abu-dhabi': [] // Will be discovered from Google Drive
};

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function main() {
  console.log('Starting Google Drive image download...\n');
  
  try {
    // Step 1: Find the Website folder
    console.log('Looking for "Website" folder...');
    const websiteFolders = await findFolderByName('Website');
    console.log('Found Website folders:', websiteFolders);
    
    if (websiteFolders.length === 0) {
      console.log('\nNo "Website" folder found. Looking for "Categories" folder directly...');
      const categoryFolders = await findFolderByName('Categories');
      console.log('Found Categories folders:', categoryFolders);
      
      if (categoryFolders.length === 0) {
        console.log('\nListing all root folders to explore...');
        const allFolders = await listFolders();
        console.log('All root folders:', allFolders);
        return;
      }
      
      // Explore Categories folder
      for (const catFolder of categoryFolders) {
        console.log(`\nExploring Categories folder: ${catFolder.name} (${catFolder.id})`);
        const subfolders = await listFolders(catFolder.id!);
        console.log('Subfolders:', subfolders);
        
        const files = await listFilesInFolder(catFolder.id!);
        console.log('Files:', files);
      }
      return;
    }
    
    // Found Website folder, look for Categories inside
    const websiteFolder = websiteFolders[0];
    console.log(`\nExploring Website folder: ${websiteFolder.name} (${websiteFolder.id})`);
    
    const websiteSubfolders = await listFolders(websiteFolder.id!);
    console.log('Subfolders in Website:', websiteSubfolders);
    
    const categoriesFolder = websiteSubfolders.find(f => f.name?.toLowerCase() === 'categories');
    
    if (!categoriesFolder) {
      console.log('No Categories subfolder found in Website.');
      
      // List files directly in Website
      const websiteFiles = await listFilesInFolder(websiteFolder.id!);
      console.log('Files in Website:', websiteFiles);
      return;
    }
    
    console.log(`\nFound Categories folder: ${categoriesFolder.id}`);
    
    // Step 2: List destination folders inside Categories
    const destinationFolders = await listFolders(categoriesFolder.id!);
    console.log('\nDestination folders in Categories:', destinationFolders.map(f => f.name));
    
    // Step 3: Create destination directories and download images
    await ensureDir(DESTINATIONS_DIR);
    
    for (const destFolder of destinationFolders) {
      const destName = destFolder.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      const destDir = path.join(DESTINATIONS_DIR, destName);
      
      console.log(`\nProcessing destination: ${destName}`);
      await ensureDir(destDir);
      
      // List and download files
      const files = await listFilesInFolder(destFolder.id!);
      console.log(`Found ${files.length} files in ${destName}`);
      
      for (const file of files) {
        if (file.mimeType?.startsWith('image/') || file.name?.endsWith('.webp') || file.name?.endsWith('.jpg') || file.name?.endsWith('.png')) {
          const filePath = path.join(destDir, file.name || 'unknown');
          
          if (fs.existsSync(filePath)) {
            console.log(`  Skipping (exists): ${file.name}`);
            continue;
          }
          
          console.log(`  Downloading: ${file.name}`);
          try {
            const buffer = await downloadFile(file.id!);
            fs.writeFileSync(filePath, buffer);
            console.log(`  Saved: ${filePath}`);
          } catch (err) {
            console.error(`  Error downloading ${file.name}:`, err);
          }
        }
      }
    }
    
    console.log('\n✅ Download complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
