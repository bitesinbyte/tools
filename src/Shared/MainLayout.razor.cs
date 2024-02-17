using System.Drawing;
using BitesInByte.Tools.Models;
using Microsoft.AspNetCore.Components;
using MudBlazor;
using MudBlazor.Services;

namespace BitesInByte.Tools.Shared
{
    public partial class MainLayout : IBrowserViewportObserver
    {
        private MudTheme _theme = new MudTheme
        {
            PaletteDark = DocsDarkPalette,
            LayoutProperties = new LayoutProperties()
        };

        private LayoutConfig layoutConfig = new();
        bool _drawerOpen = true;
        private MudThemeProvider _mudThemeProvider;

        string drawerWidth = "200px";
        bool drawerRightOpen = true;

        [Inject]
        private IBrowserViewportService BrowserViewportService { get; set; }

        private List<Breakpoint> _breakpointHistory = new();
        private Breakpoint _start;

        ResizeOptions IBrowserViewportObserver.ResizeOptions { get; } = new()
        {
            ReportRate = 250,
            NotifyOnBreakpointOnly = true
        };

        public Guid Id => Guid.NewGuid();

        Task IBrowserViewportObserver.NotifyBrowserViewportChangeAsync(BrowserViewportEventArgs browserViewportEventArgs)
        {
            if (browserViewportEventArgs.IsImmediate)
            {
                _start = browserViewportEventArgs.Breakpoint;
            }
            else
            {
                _breakpointHistory.Add(browserViewportEventArgs.Breakpoint);
            }

            return InvokeAsync(StateHasChanged);
        }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                await BrowserViewportService.SubscribeAsync(this, fireImmediately: true);

                layoutConfig.IsDarkMode = await _mudThemeProvider.GetSystemPreference();
                layoutConfig.RenderedForFirstTime = true;
                StateHasChanged();
            }
            await base.OnAfterRenderAsync(firstRender);
        }

        public void OnToggledChanged(bool toggled)
        {
            layoutConfig.IsDarkMode = toggled;
        }
        void DrawerToggle()
        {
            _drawerOpen = !_drawerOpen;
        }


        private static readonly PaletteDark DocsDarkPalette = new()
        {
            Primary = "#7e6fff",
            Surface = "#1e1e2d",
            Background = "#1a1a27",
            BackgroundGrey = "#151521",
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
}