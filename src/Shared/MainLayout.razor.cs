using BitesInByte.Tools.Models;
using Microsoft.AspNetCore.Components;
using MudBlazor;

namespace BitesInByte.Tools.Shared;

public partial class MainLayout
{
    private readonly MudTheme _theme = new()
    {
        PaletteDark = DocsDarkPalette,
        LayoutProperties = new LayoutProperties()
    };

    private readonly LayoutConfig layoutConfig = new();
    private MudThemeProvider? _mudThemeProvider;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender && _mudThemeProvider is not null)
        {
            layoutConfig.IsDarkMode = await _mudThemeProvider.GetSystemDarkModeAsync();
            layoutConfig.RenderedForFirstTime = true;
            StateHasChanged();
        }

        await base.OnAfterRenderAsync(firstRender);
    }

    private void OnToggledChanged(bool toggled)
    {
        layoutConfig.IsDarkMode = toggled;
    }

    private static readonly Palette DocsDarkPalette = new PaletteDark()
    {
        Primary = "#7e6fff",
        Surface = "#1e1e2d",
        Background = "#1a1a27",
        AppbarText = "#92929f",
        AppbarBackground = "rgba(26,26,39,0.8)",
        DrawerBackground = "#1a1a27",
        ActionDefault = "#74718e",
        ActionDisabled = "#9999994d",
        ActionDisabledBackground = "#605f6d4d",
        TextPrimary = "#b2b0bf",
        TextSecondary = "#92929f",
        TextDisabled = "#ffffff33",
        DrawerIcon = "#92929f",
        DrawerText = "#92929f",
        GrayLight = "#2a2833",
        GrayLighter = "#1e1e2d",
        Info = "#4a86ff",
        Success = "#3dcb6c",
        Warning = "#ffb545",
        Error = "#ff3f5f",
        LinesDefault = "#33323e",
        TableLines = "#33323e",
        Divider = "#292838",
        OverlayLight = "#1e1e2d80"
    };
}
