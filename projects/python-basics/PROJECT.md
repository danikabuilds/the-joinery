# Python basics: read and clean a CSV

*Python practice. A good warm-up before Just Now Deliveries. About 30 minutes, nothing to install and nothing to download.*

## Before you start

You will clean a small, messy export of 376 orders: the same kind of mess as the full project, in one file. Every step is a few lines of Python using **pandas**, the library almost every data team uses for this.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-basics/python-basics.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the file straight from The Joinery, so there is nothing to download or upload.

> **Tip:** New to notebooks? A notebook is a page of small code boxes called cells. Click into a cell and press Shift + Enter to run it. The result appears underneath.

## 1. Read the file

*About 3 minutes*

`pd.read_csv` turns a CSV file into a **DataFrame**: a table you can work with in Python, a bit like a sheet in Excel. Always check its shape (rows, columns) and the first few rows before anything else.

```python Python
import pandas as pd
```

```python Python
df = pd.read_csv(URL)
print(df.shape)
print(df.head())
```

> **You should see:** `(376, 8)`, then the first five rows.

```text Output
(376, 8)
  Order ID Customer ID          City       Province  Order Date     Status Order Total  \
0  O044903      C28101        George   Western Cape  20/11/2025  delivered     R320.44   
1  O028861      C19942     Kimberley  Northern Cape  2025-04-24  Delivered     R905.38   
2  O017405      C07421        Benoni        Gauteng  2024-11-13  delivered     R437.74   
3  O037430      C14423  Johannesburg        Gauteng  2025-08-29  delivered      R86.99   
4  O037128      C25656  Johannesburg        Gauteng  2025-08-24  delivered     R212.99   

  Delivered Date  
0     28/11/2025  
1     2025-04-30  
2     2024-11-19  
3     2025-09-01  
4     2025-08-22
```

Look closely and you can already spot problems: the dates are written two ways, the totals start with an R, and the column names have spaces and capitals.

## 2. Look before you clean

*About 5 minutes*

`info()` shows every column, how many values are filled in, and the type pandas guessed. `value_counts()` shows every different value in a column and how often it appears.

```python Python
df.info()
```

```text Output
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 376 entries, 0 to 375
Data columns (total 8 columns):
 #   Column          Non-Null Count  Dtype 
---  ------          --------------  ----- 
 0   Order ID        376 non-null    object
 1   Customer ID     376 non-null    object
 2   City            364 non-null    object
 3   Province        376 non-null    object
 4   Order Date      376 non-null    object
 5   Status          376 non-null    object
 6   Order Total     364 non-null    object
 7   Delivered Date  369 non-null    object
dtypes: object(8)
memory usage: 23.6+ KB
```

Two things stand out. City, Order Total and Delivered Date have fewer than 376 values, so some are missing. And every column is text (`object`, or `str` in the newest pandas), even the dates and the totals.

```python Python
print(df["Province"].value_counts())
```

```text Output
Province
Gauteng          105
KwaZulu-Natal     67
Western Cape      59
Eastern Cape      21
Limpopo           18
Mpumalanga        17
Free State        16
North West        12
Northern Cape     11
WC                 8
Gauteng            8
GP                 7
Kwazulu Natal      7
EC                 6
gauteng            4
FREE STATE         2
LIMPOPO            2
KZN                2
MPUMALANGA         2
western cape       1
NORTH WEST         1
Name: count, dtype: int64
```

Gauteng appears four ways: `Gauteng`, `GP`, `gauteng` and `Gauteng ` with a space at the end. To a computer those are four different provinces, so any count by province would be wrong. Writing down what you find is called **profiling** the data, and it tells you what to clean.

## 3. Tidy the column names

*About 2 minutes*

Names like `Order Date` are awkward to type in code. The usual habit is lower case with underscores, called snake_case.

```python Python
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
print(df.columns.tolist())
```

```text Output
['order_id', 'customer_id', 'city', 'province', 'order_date', 'status', 'order_total', 'delivered_date']
```

## 4. Fix the data types

*About 5 minutes*

A [data type](https://thejoinery.dev/#/glossary/term/data-type) decides what you can do with a column. You cannot add up text or subtract one date written as text from another. Totals need to become numbers, and dates need to become real dates.

The dates are the tricky part. Most are written `2025-04-24`, but some are `24/04/2025`. If you let pandas guess, it can swap the day and the month on some of them without telling you. So read each format on purpose: try the first format, try the second, and keep whichever worked.

```python Python
df["order_total"] = (df["order_total"]
                     .str.replace("R", "", regex=False)
                     .str.replace(" ", "", regex=False)
                     .astype(float))
for col in ["order_date", "delivered_date"]:
    iso = pd.to_datetime(df[col], format="%Y-%m-%d", errors="coerce")   # 2025-04-24
    dmy = pd.to_datetime(df[col], format="%d/%m/%Y", errors="coerce")   # 24/04/2025
    df[col] = iso.fillna(dmy)
print(df.dtypes)
```

> **You should see:** `order_total` is now `float64` (a number), and both date columns are `datetime64`.

```text Output
order_id                  object
customer_id               object
city                      object
province                  object
order_date        datetime64[ns]
status                    object
order_total              float64
delivered_date    datetime64[ns]
dtype: object
```

> **Tip:** `errors="coerce"` means "if a value does not fit this format, leave it empty instead of stopping". That is why `fillna` can then fill the gaps from the second format.

## 5. Tidy messy text

*About 5 minutes*

Clean text in three moves: remove spaces at the ends with `strip()`, make the case consistent, then map abbreviations to the full names.

```python Python
df["status"] = df["status"].str.strip().str.lower()
province_names = {
    "GP": "Gauteng", "WC": "Western Cape", "EC": "Eastern Cape",
    "KZN": "KwaZulu-Natal", "Kwazulu Natal": "KwaZulu-Natal",
}
df["province"] = df["province"].str.strip().replace(province_names)
df["province"] = df["province"].where(df["province"] == "KwaZulu-Natal", df["province"].str.title())
print(df["status"].value_counts())
print(df["province"].value_counts())
```

> **You should see:** two statuses instead of six, and exactly nine provinces, the nine in South Africa.

```text Output
status
delivered    374
cancelled      2
Name: count, dtype: int64
province
Gauteng          124
KwaZulu-Natal     76
Western Cape      68
Eastern Cape      27
Limpopo           20
Mpumalanga        19
Free State        18
North West        13
Northern Cape     11
Name: count, dtype: int64
```

## 6. Deal with missing values

*About 4 minutes*

Missing values (called `NaN` in pandas, and [NULL](https://thejoinery.dev/#/glossary/term/null) in SQL) are not all the same, so do not delete them all on sight. Count them, then decide column by column.

```python Python
print(df.isna().sum())
```

```text Output
order_id           0
customer_id        0
city              12
province           0
order_date         0
status             0
order_total       12
delivered_date     7
dtype: int64
```

- **City:** fill the gaps with `Unknown`, so those orders still count towards totals.
- **Order total:** leave it empty. Making up a number would be worse than having a gap, and pandas skips empty values when it adds up.
- **Delivered date:** empty for orders that were cancelled or never delivered. That is correct, not an error.

```python Python
df["city"] = df["city"].fillna("Unknown")
print(df[df["order_total"].isna()][["order_id", "status", "order_total"]].head(3))
```

```text Output
   order_id     status  order_total
12  O026863  delivered          NaN
32  O039285  delivered          NaN
38  O004870  delivered          NaN
```

## 7. Remove duplicate rows

*About 2 minutes*

Exports often contain the same row twice. `duplicated()` finds rows that are exactly the same as an earlier one. See [deduplication](https://thejoinery.dev/#/glossary/term/deduplication).

```python Python
print(df.duplicated().sum())
df = df.drop_duplicates()
print(df.shape)
```

> **You should see:** `12` duplicate rows, and then `(364, 8)`.

```text Output
12
(364, 8)
```

## 8. Catch impossible values, then save

*About 4 minutes*

Some rows are tidy but still wrong. Write each rule as a True or False check, count how many rows break it, then remove them:

- test orders, whose IDs start with `TEST`
- negative order totals
- orders delivered before they were ordered

```python Python
tests = df["order_id"].str.startswith("TEST")
negative = df["order_total"] < 0
time_travel = df["delivered_date"] < df["order_date"]
print(tests.sum(), negative.sum(), time_travel.sum())
```

> **You should see:** `4 2 3`: four test orders, two negative totals and three orders that travelled back in time.

```python Python
df = df[~tests & ~negative & ~time_travel]
print(df.shape)
df.to_csv("orders_clean.csv", index=False)
```

```text Output
(355, 8)
```

You started with 376 messy rows and finished with 355 clean ones, and you can explain every row you removed. In Colab, the clean file appears in the folder panel on the left, where you can download it.

## What you just did

| Step | What it protects |
|---|---|
| Look before you clean | You fix the real problems, not guesses |
| Data types | Sums, averages and date maths work |
| Tidy text | Counts by group are right |
| Missing values, case by case | You do not throw away good rows or invent numbers |
| Duplicates | Nothing is counted twice |
| Impossible values | Test data and errors stay out of the answers |

**Say it in an interview:** "I always profile the data first, then fix types, tidy text, handle missing values case by case, remove duplicates and check for impossible values, and I keep a count of every row I remove."

**Next:** carry on with [Explore and summarise with groupby](https://thejoinery.dev/#/projects/python-explore), which starts from the clean file you just made. Or go straight to [Beginner Data Analytics: Just Now Deliveries](https://thejoinery.dev/#/projects/just-now-deliveries), which does the same on seven files and 50 000 orders.

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.
