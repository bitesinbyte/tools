using BitesInByte.Tools.Models;
using BlazorMonaco.Editor;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;

namespace BitesInByte.Tools.Pages.Other;

public partial class TextCompare
{
    private StandaloneDiffEditor _diffEditor = null!;
    [CascadingParameter]
    public LayoutConfig LayoutConfig { get; set; }

    [Inject]
    private IJSRuntime JS { get; set; }
    private StandaloneDiffEditorConstructionOptions DiffEditorConstructionOptions(StandaloneDiffEditor editor)
    {
        return new StandaloneDiffEditorConstructionOptions
        {
            OriginalEditable = true,
            AutomaticLayout = true,
            AutoDetectHighContrast = true,
            DisableLayerHinting = true,
            DisableMonospaceOptimizations = true,
            Theme = LayoutConfig.IsDarkMode ? "vs-dark" : "vs"
        };
    }
    private async Task EditorOnDidInit()
    {
        // Get or create the original model
        TextModel original_model = await Global.GetModel(JS, "sample-diff-editor-originalModel");
        if (original_model == null)
        {
            var original_value = "Enter Here...";
            original_model = await Global.CreateModel(JS, original_value, "text", "sample-diff-editor-originalModel");
        }

        // Get or create the modified model
        TextModel modified_model = await Global.GetModel(JS, "sample-diff-editor-modifiedModel");
        if (modified_model == null)
        {
            var modified_value = "Enter Here...";
            modified_model = await Global.CreateModel(JS, modified_value, "text", "sample-diff-editor-modifiedModel");
        }

        // Set the editor model
        await _diffEditor.SetModel(new DiffEditorModel
        {
            Original = original_model,
            Modified = modified_model
        });
    }

    private async Task UploadFiles(IReadOnlyList<IBrowserFile> files)
    {
        if (!files.Any() && files.Count < 2) return;
        var text1 = await (new StreamContent(files[0].OpenReadStream(long.MaxValue)).ReadAsStringAsync());
        var text2 = await (new StreamContent(files[1].OpenReadStream(long.MaxValue)).ReadAsStringAsync());
        await _diffEditor.OriginalEditor.SetValue(text1);
        await _diffEditor.ModifiedEditor.SetValue(text2);
    }
}
