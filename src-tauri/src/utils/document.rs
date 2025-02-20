use anyhow::Result;
use pdf_extract::extract_text;
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::fs::File;
use std::io::Read;
use zip::ZipArchive;

pub fn read_docx(path: &str) -> Result<String> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)?;
    let mut content = String::new();

    // docx 文件中的文本内容存储在 word/document.xml
    if let Ok(mut doc) = archive.by_name("word/document.xml") {
        let mut xml = String::new();
        doc.read_to_string(&mut xml)?;

        let mut reader = Reader::from_str(&xml);
        reader.trim_text(true);

        let mut buf = Vec::new();
        let mut in_text = false;

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) if e.name().as_ref() == b"w:t" => {
                    in_text = true;
                }
                Ok(Event::Text(e)) if in_text => {
                    content.push_str(&e.unescape()?.into_owned());
                    content.push(' ');
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"w:p" => {
                    content.push('\n');
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(anyhow::anyhow!("解析错误: {}", e)),
                _ => (),
            }
            buf.clear();
        }
    }

    Ok(content.trim().to_string())
}

pub fn read_pdf(path: &str) -> Result<String> {
    match extract_text(path) {
        Ok(content) => Ok(content),
        Err(e) => Err(anyhow::anyhow!("PDF 解析错误: {}", e)),
    }
}
