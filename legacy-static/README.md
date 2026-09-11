# FileFit — VS Code source

This is a lightweight static website built with HTML, CSS and JavaScript.

## Open it in VS Code

1. Extract `FileFit-VS-Code.zip`.
2. Open the extracted `filefit-vscode-source` folder in VS Code.
3. Install the **Live Server** extension if you do not have it.
4. Right-click `index.html` and choose **Open with Live Server**.

Use Live Server because the JavaScript files use browser modules. Opening `index.html` directly by double-clicking may prevent the tools from loading.

## Main files

- `index.html` — page structure and visible text
- `style.css` — colours, layout and mobile design
- `app.js` — file upload and processing behaviour
- `core.js` — image resizing calculations
- `vendor/pdf-lib.js` — local PDF processing library

## Easy colour change

Open `style.css` and change these values at the top:

```css
--green: #165940;
--green-hover: #10452f;
```

For a purple style, try:

```css
--green: #71389A;
--green-hover: #572675;
```

All photo, signature and PDF processing happens inside the visitor's browser. Files are not uploaded to a server.
