#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { marked } from 'marked';
import Epub from 'epub-gen';
import nodemailer from 'nodemailer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import 'dotenv/config'

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 (--file <markdown_path> | --url <markdown_url>) --email <kindle_email>')
  .option('file', {
    alias: 'f',
    describe: 'Path to a local Markdown file',
    type: 'string'
  })
  .option('url', {
    alias: 'u',
    describe: 'URL to Markdown content',
    type: 'string'
  })
  .option('email', {
    alias: 'e',
    describe: 'Your Kindle email address',
    type: 'string',
    demandOption: false
  })
  .check(argv => {
    if (!argv.file && !argv.url) throw new Error('Please provide either --file or --url.');
    return true;
  })
  .help()
  .argv;

async function fetchMarkdown(source, isLocal) {
  if (isLocal) {
    return fs.readFileSync(source, 'utf-8');
  } else {
    const response = await axios.get(source);
    return response.data;
  }
}

(async () => {
  try {
    const isLocal = !!argv.file;
    const source = argv.file || argv.url;
    const markdown = await fetchMarkdown(source, isLocal);
    const html = marked(markdown);
    const epubTitle = isLocal ? path.basename(source, '.md') : 'Web Markdown';
    const kindleEmail = argv.email || process.env.emailKindle;
    const kindleSender = process.env.emailSender;
    const authEmail = process.env.keyEmail;

    await new Epub(
      {
        title: epubTitle,
        author: 'Markdown Converter',
        content: [{ title: 'Markdown Content', data: html }]
      },
      './output.epub'
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: kindleSender,
        pass: authEmail
      }
    });

    await transporter.sendMail({
      from: kindleSender,
      to: kindleEmail,
      subject: '',
      html: '<div dir="auto"></div>',
      attachments: [{filename: 'test.epub', path: './output.epub' }]
    });

    console.log(`✅ EPUB successfully sent to ${kindleEmail}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
})();
