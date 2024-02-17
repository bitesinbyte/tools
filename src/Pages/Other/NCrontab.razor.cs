using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using MudBlazor;
using NCrontab;


namespace BitesInByte.Tools.Pages.Other;

public partial class NCrontab
{
    private const string DefaultCronExpression = "0 0 12 * */2 Mon";
    private readonly DateTime startDate = DateTime.Today;
    [CascadingParameter]
    public bool IsDarkMode { get; set; }
    [Parameter]
    [SupplyParameterFromQuery(Name = "expression")]
    public string Expression { get; set; }
    private CrontabSchedule cronSchedule = CrontabSchedule.Parse(DefaultCronExpression, new CrontabSchedule.ParseOptions { IncludingSeconds = true });
    private readonly List<DateTime> Occurrences = new();
    [Inject]
    private IJSRuntime JS { get; set; }
    [Inject]
    public ISnackbar Snackbar { get; set; }

    private bool isExpression6PartFormat = true;
    private bool isExpressionValid = true;

    public void HandlePrintMore()
    {
        if (!isExpressionValid)
        {
            Snackbar.Add("Invalid Expression", Severity.Warning);
        }
        PrintOccurrences();
    }

    public async Task HandleCopyLink()
    {
        var readableCron = CronToReadableQuery(Expression);
        var url = $"https://tools.bitesinbyte.com/NCrontab?expression={readableCron}";
        await JS.InvokeVoidAsync("clipboardCopy.copyText", url);
    }
    public void HandleTextChanged()
    {
        SetExpression();
    }
    protected override void OnInitialized()
    {
        TransformExpression();
    }

    private void TransformExpression()
    {
        if (string.IsNullOrEmpty(Expression))
        {
            Expression = DefaultCronExpression;
        }
        Expression = ReadableQueryToCron(Expression);
    }
    private void PrintOccurrences()
    {
        var mostRecentDate = Occurrences.Count == 0 ? startDate : Occurrences.Last();
        for (int i = 0; i < 10; i++)
        {
            mostRecentDate = cronSchedule.GetNextOccurrence(mostRecentDate);
            Occurrences.Add(mostRecentDate);
        }
    }
    private void SetExpression()
    {
        TransformExpression();
        Occurrences.Clear();
        isExpression6PartFormat = Expression
            .Trim().Replace(@"\t", " ").Split(' ', StringSplitOptions.RemoveEmptyEntries).Length == 6;

        try
        {
            cronSchedule = CrontabSchedule.Parse(Expression, new CrontabSchedule.ParseOptions { IncludingSeconds = isExpression6PartFormat });
            isExpressionValid = true;
            PrintOccurrences();
        }
        catch (CrontabException exception)
        {
            Snackbar.Add($"Invalid Expression : {exception.Message}", Severity.Error);
            isExpression6PartFormat = true;
            isExpressionValid = false;
        }
    }
    private static string CronToReadableQuery(string query) => query.Replace(' ', '+');
    private static string ReadableQueryToCron(string query) => query.Replace('+', ' ');
}
