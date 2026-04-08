using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;
using MudBlazor;
using System.Globalization;
using System.Text;

namespace BitesInByte.Tools.Pages.Other;

public partial class ChangeCsvDelimiter
{
    public string ExistingDelimiter { get; set; } = string.Empty;
    public string NewDelimiter { get; set; } = string.Empty;
    private List<dynamic> csvData = [];
    private string filePath = string.Empty;

    [Inject]
    private ISnackbar SnackbarStack { get; set; } = null!;

    [Inject]
    private IJSRuntime JS { get; set; } = null!;

    private async Task UploadFile(IBrowserFile file)
    {
        try
        {
            var fileContent = new StreamContent(file.OpenReadStream(long.MaxValue));
            var content = await fileContent.ReadAsStringAsync();
            using var reader = new StringReader(content);
            var option = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                DetectDelimiter = true
            };
            using var csvReader = new CsvReader(reader, option);
            csvData = csvReader.GetRecords<dynamic>().ToList();

            var streamcontent = await fileContent.ReadAsStreamAsync();
            using var streamreader = new StreamReader(streamcontent);
            ExistingDelimiter = DetectDelimiter(streamreader);
            SnackbarStack.Add("Successfully loaded the CSV.");
        }
        catch
        {
            SnackbarStack.Add("Something went wrong!!", Severity.Error);
        }
    }

    public static string DetectDelimiter(StreamReader reader)
    {
        var possibleDelimiters = new List<string> { ",", ";", "\t", "|" };
        var headerLine = reader.ReadLine();

        reader.BaseStream.Position = 0;
        reader.DiscardBufferedData();

        if (headerLine is not null)
        {
            foreach (var possibleDelimiter in possibleDelimiters)
            {
                if (headerLine.Contains(possibleDelimiter))
                {
                    return possibleDelimiter;
                }
            }
        }

        return possibleDelimiters[0];
    }

    private async Task HandleConvertDelimiterAndDownload()
    {
        try
        {
            if (string.IsNullOrEmpty(ExistingDelimiter))
            {
                return;
            }
            var option = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = NewDelimiter
            };
            var fileName = Path.GetTempFileName();
            filePath = Path.Combine(Path.GetTempPath(), fileName);
            using (var sw = new StreamWriter(filePath, false, Encoding.Unicode))
            {
                var outputCsv = new CsvWriter(sw, option);
                await outputCsv.WriteRecordsAsync(csvData);
                SnackbarStack.Add("Successfully converted CSV", Severity.Success);
                sw.Close();
            }
            var data = await File.ReadAllTextAsync(filePath);
            var byteArray = Encoding.ASCII.GetBytes(data);
            var stream = new MemoryStream(byteArray);
            using var streamRef = new DotNetStreamReference(stream: stream);
            await JS.InvokeVoidAsync("downloadFileFromStream", "bitesinbyte-csv-tool.csv", streamRef);
        }
        catch
        {
            SnackbarStack.Add("Something went wrong!!", Severity.Error);
        }
    }
}
