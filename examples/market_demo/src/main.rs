use gascat::plugins::market::{MarketManager, MarketConfig, PluginRating};
use anyhow::Result;
use chrono::Utc;

#[tokio::main]
async fn main() -> Result<()> {
    // 创建市场管理器
    let manager = MarketManager::new()?;
    
    // 加载市场配置
    manager.load_markets().await?;
    
    // 添加第三方市场
    let third_party_market = MarketConfig {
        source_url: "https://plugins.example.com".to_string(),
        name: "示例插件市场".to_string(),
        description: "第三方插件市场示例".to_string(),
        official: false,
        enabled: true,
    };
    manager.add_market(third_party_market).await?;
    
    // 列出所有市场
    println!("可用的插件市场:");
    for market in manager.list_markets().await {
        println!("  - {} ({})", market.name, market.source_url);
        
        // 获取市场分类
        if let Ok(categories) = manager.get_categories(&market.name).await {
            println!("    分类:");
            for category in categories {
                println!("      - {} ({}个插件)", category.name, category.plugin_count);
            }
        }
    }
    
    // 搜索插件
    println!("\n搜索 'hello' 相关插件:");
    if let Ok(results) = manager.search_plugins("hello", 1, 10).await {
        for result in results {
            println!("在 {} 中找到 {} 个结果:", result.items[0].metadata.name, result.total);
            for plugin in result.items {
                println!("  - {} v{}", plugin.metadata.name, plugin.metadata.version);
                println!("    作者: {}", plugin.metadata.author);
                println!("    描述: {}", plugin.metadata.description);
                println!("    评分: {:.1} ({} 人评价)", plugin.rating, plugin.rating_count);
            }
        }
    }
    
    // 安装插件
    println!("\n安装 hello_plugin:");
    if let Err(e) = manager.install_plugin("GasCat 官方插件市场", "hello_plugin").await {
        println!("安装失败: {}", e);
    } else {
        println!("安装成功!");
        
        // 提交评分
        let rating = PluginRating {
            plugin_id: "hello_plugin".to_string(),
            user_id: "test_user".to_string(),
            score: 5,
            comment: Some("非常好用的插件!".to_string()),
            created_at: Utc::now(),
        };
        
        if let Err(e) = manager.submit_rating("GasCat 官方插件市场", rating).await {
            println!("评分失败: {}", e);
        } else {
            println!("评分成功!");
        }
        
        // 查看评分
        if let Ok(ratings) = manager.get_ratings("GasCat 官方插件市场", "hello_plugin", 1, 10).await {
            println!("\n插件评价:");
            for rating in ratings {
                println!("  - {} 评分: {} 星", rating.user_id, rating.score);
                if let Some(comment) = rating.comment {
                    println!("    评论: {}", comment);
                }
            }
        }
    }
    
    Ok(())
} 