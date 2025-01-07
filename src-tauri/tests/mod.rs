#[cfg(test)]
mod tests {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_agent() {
        // 设置测试环境变量
        std::env::set_var("OPENAI_API_KEY", "your-api-key-here");
    }
}
