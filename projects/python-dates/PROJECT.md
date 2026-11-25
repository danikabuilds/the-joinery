# Work with dates

*Python practice. About 25 minutes, nothing to install and nothing to download.*

## Before you start

Almost every business question has a date in it: how long did delivery take, what happened last month, which day is busiest. You will answer those from the 355 clean orders.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-dates/python-dates.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the practice files straight from The Joinery, so there is nothing to download or upload.

## 1. Read the dates as dates

*About 2 minutes*

```python Python
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/"
headers = {"User-Agent": "Mozilla/5.0"}   # some websites block Python's default request; this sends a browser-style name
orders = pd.read_csv(BASE + "orders.csv", parse_dates=["order_date", "delivered_date"], storage_options=headers)
print(orders[["order_date", "delivered_date"]].dtypes)
```

> **Tip:** The `headers` line tells the website the request comes from a browser. Without it, the site's host turns Python away with an `HTTP Error 403: Forbidden`. You only need it for files on websites, not for files on your own computer.

> **You should see:** both columns as `datetime64`. If they say `object` or `str`, the `parse_dates` part is missing.

```text Output
order_date        datetime64[ns]
delivered_date    datetime64[ns]
dtype: object
```

## 2. Days between two dates

*About 4 minutes*

Subtract one date column from another and you get a time difference. `.dt.days` turns it into a plain number of days. The `.dt` part is how pandas gives you date tools for a whole column.

```python Python
orders["days_to_deliver"] = (orders["delivered_date"] - orders["order_date"]).dt.days
print(orders[["order_date", "delivered_date", "days_to_deliver"]].head(3))
print(orders["days_to_deliver"].describe().round(1))
```

```text Output
  order_date delivered_date  days_to_deliver
0 2025-11-20     2025-11-28              8.0
1 2025-04-24     2025-04-30              6.0
2 2024-11-13     2024-11-19              6.0
count    352.0
mean       5.4
std        2.2
min        2.0
25%        4.0
50%        5.0
75%        6.0
max       19.0
Name: days_to_deliver, dtype: float64
```

The count is 352, because orders without a delivered date (cancelled ones, for example) have no answer, so pandas leaves them empty. A typical delivery takes 5 days, and the slowest took 19.

The days show as `8.0` rather than `8` because the column has empty values: pandas stores whole numbers with gaps as decimals.

## 3. Flag late orders

*About 5 minutes*

Say the promise is delivery within 5 days. Keep only the orders that were delivered, then add a True or False column. The average of True and False is the share that is True, because True counts as 1 and False as 0.

```python Python
delivered = orders[orders["days_to_deliver"].notna()].copy()
delivered["late"] = delivered["days_to_deliver"] > 5
print(delivered["late"].sum(), "late out of", len(delivered))
late_by_province = (delivered.groupby("province")["late"].mean() * 100).round(1).sort_values(ascending=False)
print(late_by_province)
```

```text Output
144 late out of 352
province
Northern Cape    100.0
Eastern Cape      73.1
Free State        56.2
Mpumalanga        50.0
Limpopo           50.0
KwaZulu-Natal     45.6
North West        38.5
Western Cape      31.8
Gauteng           26.3
Name: late, dtype: float64
```

144 of 352 delivered orders were late, about 41%. Northern Cape shows 100%, but it has only 11 orders, so check the group size before you raise the alarm. Gauteng is late least often, at about one order in four.

> **Tip:** `.copy()` makes `delivered` a separate table. Without it, pandas may warn you that you are changing a slice of another table.

## 4. Pull out the year, month and weekday

*About 4 minutes*

```python Python
orders["year"] = orders["order_date"].dt.year
orders["month"] = orders["order_date"].dt.month_name()
orders["weekday"] = orders["order_date"].dt.day_name()
print(orders[["order_date", "year", "month", "weekday"]].head(3))
week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
print(orders["weekday"].value_counts().reindex(week))
```

```text Output
  order_date  year     month    weekday
0 2025-11-20  2025  November   Thursday
1 2025-04-24  2025     April   Thursday
2 2024-11-13  2024  November  Wednesday
weekday
Monday       44
Tuesday      51
Wednesday    68
Thursday     43
Friday       44
Saturday     53
Sunday       52
Name: count, dtype: int64
```

`value_counts()` sorts by size, so `reindex(week)` puts the days back in calendar order. Wednesday looks busiest, but with only 355 orders, a difference of 20 or so could be chance.

## 5. Monthly totals

*About 5 minutes*

`to_period("M")` turns each date into its month, such as `2025-11`, so every order in the same month gets the same label. Then group by it.

```python Python
orders["year_month"] = orders["order_date"].dt.to_period("M")
monthly = (orders
           .groupby("year_month")
           .agg(orders=("order_id", "count"), revenue=("order_total", "sum"))
           .round(2))
print(monthly.tail(6))
```

```text Output
            orders   revenue
year_month                  
2025-06         21  42266.08
2025-07         17  18812.60
2025-08         23  19591.33
2025-09         17  17472.89
2025-10         26  26475.75
2025-11         28  19829.51
```

Be careful with the first and last months in any data: if the data starts or stops part way through a month, that month looks small for no real reason.

## 6. Filter by date

*About 4 minutes*

Work out dates relative to the newest one, rather than typing today's date, so the code still works next month. `pd.Timedelta(days=90)` is a length of time you can add or subtract.

```python Python
latest = orders["order_date"].max()
last_90_days = orders[orders["order_date"] > latest - pd.Timedelta(days=90)]
print(latest.date(), len(last_90_days))
first_quarter = orders[orders["order_date"].between("2025-01-01", "2025-03-31")]
print(len(first_quarter))
```

> **You should see:** `2025-11-30 70`, then `44`.

```text Output
2025-11-30 70
44
```

> **Tip:** `between` includes both ends. If your dates also have times, `"2025-03-31"` means midnight at the start of 31 March, so most of that day would be left out.

## What you just did

| Tool | What it is for |
|---|---|
| `parse_dates=` | Reading dates as dates |
| Subtracting dates, `.dt.days` | How long something took |
| A True or False column, then `mean()` | The share of rows that meet a rule |
| `.dt.year`, `.dt.month_name()`, `.dt.day_name()` | Grouping by parts of a date |
| `.dt.to_period("M")` | Monthly totals |
| `pd.Timedelta` and `between` | Date ranges |

**Say it in an interview:** "I make sure dates are real dates first, then calculate durations and flags as columns, and I watch out for part months and small groups before drawing conclusions."

**Next:** [Charts with Matplotlib](https://thejoinery.dev/#/projects/python-charts). Late deliveries are the heart of [Just Now Deliveries](https://thejoinery.dev/#/projects/just-now-deliveries).

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.
