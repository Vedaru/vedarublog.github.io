/**
 * 头像图片优化脚本
 * 生成多种尺寸的优化版本，用于响应式加载
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const inputFile = join(projectRoot, 'public/assets/home/Image_1764853150683.webp');
const outputDir = join(projectRoot, 'public/assets/home');

// 确保输出目录存在
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function optimizeAvatar() {
  console.log('🖼️  开始优化头像图片...');
  console.log(`📁 输入文件: ${inputFile}`);
  
  try {
    const image = sharp(inputFile);
    const metadata = await image.metadata();
    
    console.log(`📐 原始尺寸: ${metadata.width}x${metadata.height}`);
    console.log(`📦 原始大小: ${(metadata.size / 1024).toFixed(2)} KB`);
    
    // 生成不同尺寸的版本
    const sizes = [
      { width: 28, name: 'avatar-28w.webp', quality: 90 },
      { width: 56, name: 'avatar-56w.webp', quality: 90 },  // 2x for retina
      { width: 80, name: 'avatar-80w.webp', quality: 85 },
      { width: 160, name: 'avatar-160w.webp', quality: 85 }, // 2x for retina
      { width: 200, name: 'avatar-200w.webp', quality: 80 },
      { width: 400, name: 'avatar-400w.webp', quality: 80 }, // 2x for retina
    ];
    
    for (const size of sizes) {
      const outputPath = join(outputDir, size.name);
      
      await sharp(inputFile)
        .resize(size.width, size.width, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ 
          quality: size.quality,
          effort: 6  // 更高的压缩努力程度
        })
        .toFile(outputPath);
      
      const stats = await sharp(outputPath).metadata();
      console.log(`✅ 生成 ${size.width}x${size.width}: ${size.name} (${(stats.size / 1024).toFixed(2)} KB)`);
    }
    
    // 优化原始文件
    const optimizedPath = join(outputDir, 'Image_1764853150683-optimized.webp');
    await sharp(inputFile)
      .webp({ 
        quality: 85,
        effort: 6
      })
      .toFile(optimizedPath);
    
    const optimizedStats = await sharp(optimizedPath).metadata();
    console.log(`\n✨ 优化原始文件: Image_1764853150683-optimized.webp`);
    console.log(`   尺寸: ${optimizedStats.width}x${optimizedStats.height}`);
    console.log(`   大小: ${(optimizedStats.size / 1024).toFixed(2)} KB`);
    console.log(`   节省: ${((1 - optimizedStats.size / metadata.size) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 图片优化完成！');
    console.log('\n📋 使用建议:');
    console.log('   - 导航栏 logo (28x28): avatar-28w.webp / avatar-56w.webp');
    console.log('   - Profile 头像 (80-200px): avatar-80w.webp / avatar-160w.webp');
    console.log('   - 大尺寸显示: avatar-200w.webp / avatar-400w.webp');
    
  } catch (error) {
    console.error('❌ 优化失败:', error.message);
    process.exit(1);
  }
}

optimizeAvatar();
