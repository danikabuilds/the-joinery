# From notebook to script: many files

*Python practice. About 30 minutes, nothing to install and nothing to download.*

## Before you start

Data rarely arrives as one tidy file. Here, a shop exports a new file of orders every day, and you have a week of them. You will write a small [function](https://thejoinery.dev/#/glossary/term/python-function), loop over the files, combine them, check them, and finally turn the notebook into a script that could run every morning on its own.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-files/python-files.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the practice files straight from The Joinery, so there is nothing to download or upload.

## 1. A function to read one day

*About 6 minutes*

A function is a recipe you write once and use many times. `def` starts it, the name in brackets (`day`) is the input, and `return` hands back the result. The text in triple quotes describes what it does.

The `f` before the quotes makes an [f-string](https://thejoinery.dev/#/glossary/term/f-string): anything in `{curly brackets}` is replaced with its value, so `f"orders_{day}.csv"` becomes `orders_2025-11-24.csv`.

```python Python
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/daily/"
headers = {"User-Agent": "Mozilla/5.0"}   # some websites block Python's default request; this sends a browser-style name

def load_day(day):
    """Read one day's export and note which file each row came from."""
    df = pd.read_csv(f"{BASE}orders_{day}.csv", storage_options=headers)
    df["source_file"] = f"orders_{day}.csv"
    return df

monday = load_day("2025-11-24")
print(monday.shape)
print(monday.head(3))
```

> **Tip:** The `headers` line tells the website the request comes from a browser. Without it, the site's host turns Python away with an `HTTP Error 403: Forbidden`. You only need it for files on websites, not for files on your own computer.

```text Output
(113, 6)
  order_id customer_id           order_time     status  order_total            source_file
0  O044966      C30997  2025-11-24 00:39:54  delivered      8399.13  orders_2025-11-24.csv
1  O045732      C31545  2025-11-24 00:48:39  delivered      2295.08  orders_2025-11-24.csv
2  O044849      C30928  2025-11-24 01:37:37  delivered       133.59  orders_2025-11-24.csv
```

Adding `source_file` means that, after combining, you can always tell which file each row came from. That makes problems much easier to trace.

## 2. Loop over the week

*About 5 minutes*

`pd.date_range` makes the seven dates, and `strftime("%Y-%m-%d")` writes them as text such as `2025-11-24`. The `for` loop runs the indented lines once for each day, and `frames.append(df)` adds each day's table to a list.

```python Python
days = pd.date_range("2025-11-24", "2025-11-30").strftime("%Y-%m-%d")
frames = []
for day in days:
    df = load_day(day)
    print(day, df.shape)
    frames.append(df)
```

```text Output
2025-11-24 (113, 6)
2025-11-25 (115, 6)
2025-11-26 (133, 6)
2025-11-27 (113, 6)
2025-11-28 (117, 6)
2025-11-29 (128, 6)
2025-11-30 (134, 7)
```

Look at the last line: 7 columns instead of 6. Something changed on the last day.

## 3. Spot new columns

*About 4 minutes*

Turn each file's column names into a set, then subtract the first file's set. Whatever is left is new.

```python Python
first_columns = set(frames[0].columns)
for df in frames:
    new_columns = set(df.columns) - first_columns
    if new_columns:
        print(df["source_file"].iloc[0], "has new columns:", new_columns)
```

```text Output
orders_2025-11-30.csv has new columns: {'delivery_method'}
```

The 30 November file has a new `delivery_method` column. When a file's columns change without warning, it is called [schema drift](https://thejoinery.dev/#/glossary/term/schema-drift), and it breaks many pipelines.

## 4. Combine the files

*About 4 minutes*

`pd.concat` stacks tables on top of each other. `ignore_index=True` numbers the rows afresh from 0. Columns that are missing from some files are filled with empty values rather than causing an error.

```python Python
week = pd.concat(frames, ignore_index=True)
print(week.shape)
print(sum(len(df) for df in frames))
print(week["delivery_method"].isna().sum(), "rows have no delivery_method")
```

> **You should see:** `(853, 7)`, then `853`, then `719 rows have no delivery_method`.

```text Output
(853, 7)
853
719 rows have no delivery_method
```

The combined row count matches the sum of the files, so nothing was lost or doubled. The 719 empty delivery methods are the six days before the column existed. That is expected, but you would want to tell whoever uses this data.

## 5. Check the result

*About 4 minutes*

```python Python
print(week["order_id"].is_unique)
by_file = (week
           .groupby("source_file")
           .agg(orders=("order_id", "count"), revenue=("order_total", "sum"))
           .round(2))
print(by_file)
```

```text Output
True
                       orders    revenue
source_file                             
orders_2025-11-24.csv     113  149105.63
orders_2025-11-25.csv     115  129303.00
orders_2025-11-26.csv     133  145825.99
orders_2025-11-27.csv     113  115147.30
orders_2025-11-28.csv     117  131410.79
orders_2025-11-29.csv     128  141644.25
orders_2025-11-30.csv     134  145721.39
```

Every order ID is unique across the week, so no order was exported twice, and each day has a sensible count and total. A quick check like this, every time new files arrive, is the start of a [data quality](https://thejoinery.dev/#/glossary/term/data-quality) check.

## 6. Turn it into a script

*About 7 minutes*

A notebook is great for exploring, but a job that should run every day belongs in a script: one `.py` file that runs from top to bottom with no clicking. See [notebook vs script](https://thejoinery.dev/#/glossary/term/notebook-vs-script).

In Colab, `%%writefile` at the top of a cell saves the rest of the cell as a file instead of running it.

```python Notebook cell
%%writefile combine_week.py
"""Combine a week of daily order exports into one file."""
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/daily/"
headers = {"User-Agent": "Mozilla/5.0"}   # some websites block Python's default request; this sends a browser-style name
DAYS = pd.date_range("2025-11-24", "2025-11-30").strftime("%Y-%m-%d")


def load_day(day):
    df = pd.read_csv(f"{BASE}orders_{day}.csv", storage_options=headers)
    df["source_file"] = f"orders_{day}.csv"
    return df


def main():
    week = pd.concat([load_day(day) for day in DAYS], ignore_index=True)
    week.to_csv("week.csv", index=False)
    print(f"Combined {len(DAYS)} files into week.csv: {len(week)} rows")


if __name__ == "__main__":
    main()
```

```text Output
Writing combine_week.py
```

Then run the script. The `!` at the start sends the line to the computer's command line instead of to Python, which is how you would run it outside Colab too.

```python Notebook cell
!python combine_week.py
```

> **You should see:** `Combined 7 files into week.csv: 853 rows`

```text Output
Combined 7 files into week.csv: 853 rows
```

Two new pieces in the script: `main()` holds the steps, and `if __name__ == "__main__":` means "run `main()` only when this file is run directly, not when another script borrows its functions".

## What you just did

| Step | Why it matters |
|---|---|
| A function with an f-string | Write the logic once and reuse it |
| A `source_file` column | Every row can be traced to its file |
| Comparing column sets | Schema drift is caught, not discovered later |
| `pd.concat`, then count rows | Nothing is lost or doubled |
| A script with `main()` | The job can run on a schedule without you |

**Say it in an interview:** "When I load many files, I add the file name to each row, check for new or missing columns, and compare row counts before and after combining. Then I move the logic into a script so it can run on a schedule."

**Next:** you are ready for [Build the plumbing](https://thejoinery.dev/#/projects/build-the-plumbing), which loads daily files into a warehouse and deals with exactly these problems at scale.

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.
