use rand::{thread_rng, Rng};
use std::time::{SystemTime, UNIX_EPOCH};
// 辅助函数
pub fn generate_id() -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let mut rng = thread_rng();
    let mut id = String::with_capacity(16);

    for i in 0..8 {
        let time_byte = ((timestamp >> (i * 4)) ^ (timestamp >> (i * 2))) & 0x3f;
        id.push(CHARS[time_byte as usize % CHARS.len()] as char);
    }
    for _ in 0..8 {
        id.push(CHARS[rng.gen::<usize>() % CHARS.len()] as char);
    }
    id
}
