using BlazorMonaco.Editor;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json;
using System.Dynamic;
using System.Text.Json;
using YamlConverter;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using BitesInByte.Tools.Models;

namespace BitesInByte.Tools.Pages.Converters;

public partial class JsonToYaml
{
    [CascadingParameter]
    public LayoutConfig LayoutConfig { get; set; }

    private StandaloneCodeEditor _editorJson = null!;
    private StandaloneCodeEditor _editorYaml = null!;
    [Inject]
    public ISnackbar Snackbar { get; set; }
    private StandaloneEditorConstructionOptions EditorConstructionOptionsJson(StandaloneCodeEditor editor)
    {
        return new StandaloneEditorConstructionOptions
        {
            GlyphMargin = true,
            Language = "json",
            AutoIndent = "true",
            FormatOnPaste = true,
            FormatOnType = true,
            DetectIndentation = true,
            WrappingIndent = "true",
            Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
        };
    }

    private StandaloneEditorConstructionOptions EditorConstructionOptionsYaml(StandaloneCodeEditor editor)
    {
        return new StandaloneEditorConstructionOptions
        {
            GlyphMargin = true,
            Language = "yaml",
            AutoIndent = "true",
            FormatOnPaste = true,
            FormatOnType = true,
            DetectIndentation = true,
            WrappingIndent = "true",
            ReadOnly = true,
            Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
        };
    }

    public async Task HandleConvert()
    {
        try
        {
            var json = await _editorJson.GetValue();
            if (string.IsNullOrEmpty(json))
            {
                Snackbar.Add("Please enter json", Severity.Error);
            }

            var expConverter = new ExpandoObjectConverter();
            dynamic deserializedObject = JsonConvert.DeserializeObject<ExpandoObject>(json, expConverter);

            var serializer = new Serializer();
            string yaml = serializer.Serialize(deserializedObject);
            await _editorYaml.SetValue(yaml);
        }
        catch
        {
            Snackbar.Add("Something went wrong!!", Severity.Error);
        }
    }
}
