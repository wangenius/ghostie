use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::task::JoinHandle;
use colored::*;

pub struct LoadingSpinner {
    running: Arc<AtomicBool>,
}

impl LoadingSpinner {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn start(&self) -> JoinHandle<io::Result<()>> {
        let running = self.running.clone();
        tokio::spawn(async move {
            let frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
            let mut i = 0;
            while running.load(Ordering::SeqCst) {
                print!("\r{} 思考中...", frames[i].cyan());
                io::stdout().flush()?;
                i = (i + 1) % frames.len();
                tokio::time::sleep(tokio::time::Duration::from_millis(80)).await;
            }
            print!("\r                                          \r"); // 清除加载动画
            io::stdout().flush()?;
            Ok(())
        })
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
} 