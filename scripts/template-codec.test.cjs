const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.resolve(
  __dirname,
  "../miniprogram/pages/show/create/templateCodec.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
}).outputText;
const runtimeModule = new Module(sourcePath, module);
runtimeModule.filename = sourcePath;
runtimeModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
runtimeModule._compile(output, sourcePath);

const {
  decodeTemplateData,
  encodeTemplateData,
  getElementLabel,
  toCanvasDisplayStyle,
  updateStyleValue,
} = runtimeModule.exports;

test("decodeTemplateData validates arrays and malformed JSON", () => {
  assert.deepEqual(decodeTemplateData('[{"type":"text"}]'), {
    list: [{ type: "text" }],
    valid: true,
  });
  assert.deepEqual(decodeTemplateData('{"type":"text"}'), {
    list: [],
    valid: false,
  });
  assert.deepEqual(decodeTemplateData("{"), {
    list: [],
    valid: false,
  });
});

test("updateStyleValue updates existing values and safely appends missing keys", () => {
  assert.equal(
    updateStyleValue("color:#111;font-size:4vw", "color", "#222"),
    "color:#222;font-size:4vw",
  );
  assert.equal(
    updateStyleValue("color:#111", "letter-spacing", "2vw"),
    "color:#111;letter-spacing:2vw",
  );
});

test("encodeTemplateData converts vw values and preserves colon-containing values", () => {
  const encoded = encodeTemplateData({
    _templateData: [
      {
        type: "image",
        name: "https://example.com/a.png",
        style: "left:12vw;background-image:url(https://example.com/a.png)",
        displayStyle: "left:42px;background-image:url(https://example.com/a.png)",
      },
    ],
  });
  const list = JSON.parse(encoded);
  assert.equal(list[0].style.left, 0.12);
  assert.equal(
    list[0].style["background-image"],
    "url(https://example.com/a.png)",
  );
  assert.equal("displayStyle" in list[0], false);
});

test("toCanvasDisplayStyle scales viewport units to the actual canvas width", () => {
  assert.equal(
    toCanvasDisplayStyle("left:12vw;top:4.5vw;color:#111", 3.5),
    "left:42px;top:15.75px;color:#111",
  );
});

test("getElementLabel provides stable business labels", () => {
  assert.equal(getElementLabel({ type: "text", key: "eventDate" }, 0), "活动日期");
  assert.equal(getElementLabel({ type: "image" }, 1), "个性图片 2");
  assert.equal(getElementLabel({ type: "text" }, 2), "自定义文字 3");
});

test("text style controls stay inline with the invitation canvas", () => {
  const createWxml = fs.readFileSync(
    path.resolve(__dirname, "../miniprogram/pages/show/create/create.wxml"),
    "utf8",
  );
  const createScript = fs.readFileSync(
    path.resolve(__dirname, "../miniprogram/pages/show/create/create.ts"),
    "utf8",
  );

  assert.match(createWxml, /class="inline-style-editor"/);
  assert.match(createWxml, /bindchanging="bindTemplateDataChange"/);
  assert.match(createWxml, /class="field-rail"/);
  assert.match(createWxml, /class="font-sample/);
  assert.match(createWxml, /class="editor-save-state/);
  assert.doesNotMatch(createWxml, /id="the-elementEdit"/);
  assert.doesNotMatch(createWxml, /tapElementStyle/);
  assert.doesNotMatch(createScript, /#the-elementEdit/);
});

test("color picker restores the selected text color without changing it", () => {
  const colorPickerPath = path.resolve(
    __dirname,
    "../miniprogram/components/color-picker/color-picker.js",
  );
  const previousComponent = global.Component;
  let definition;
  global.Component = (config) => {
    definition = config;
  };
  delete require.cache[colorPickerPath];
  require(colorPickerPath);
  global.Component = previousComponent;

  let changeCount = 0;
  const instance = {
    data: { value: "#b53b2e" },
    setData(nextData) {
      this.data = { ...this.data, ...nextData };
    },
    triggerEvent() {
      changeCount += 1;
    },
    ...definition.methods,
  };

  definition.lifetimes.attached.call(instance);
  assert.equal(instance.data.pickerData.hex, "#b53b2e");
  assert.equal(changeCount, 0);
});
