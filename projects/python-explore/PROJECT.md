# Explore and summarise with groupby

*Python practice. About 25 minutes, nothing to install and nothing to download.*

## Before you start

You will explore the 355 clean orders from [Python basics](https://thejoinery.dev/#/projects/python-basics) and answer the questions a manager actually asks: how big is a typical order, where do orders come from, and which province brings in the most money.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-explore/python-explore.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the practice files straight from The Joinery, so there is nothing to download or upload.

> **Tip:** Every step builds on the one before, like cells in one notebook. If something says a name is not defined, run the earlier cells first.

## 1. Read the file with real dates

*About 3 minutes*

A CSV file is plain text, so it cannot remember that a column held dates. Tell `read_csv` which columns are dates with `parse_dates`, and they arrive ready to use.

```python Python
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/"
headers = {"User-Agent": "Mozilla/5.0"}   # some websites block Python's default request; this sends a browser-style name
orders = pd.read_csv(BASE + "orders.csv", parse_dates=["order_date", "delivered_date"], storage_options=headers)
print(orders.shape)
print(orders.dtypes)
```

> **Tip:** The `headers` line tells the website the request comes from a browser. Without it, the site's host turns Python away with an `HTTP Error 403: Forbidden`. You only need it for files on websites, not for files on your own computer.

> **You should see:** `(355, 8)`, and both date columns as `datetime64`.

```text Output
(355, 8)
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

Text columns show as `object` (or `str` in the newest pandas). Both mean text.

## 2. Summarise one column

*About 4 minutes*

`describe()` gives the count, average (mean), spread and quartiles of a number column in one go.

```python Python
print(orders["order_total"].describe().round(2))
print("Median:", orders["order_total"].median())
```

```text Output
count     343.00
mean     1151.83
std      1595.28
min        39.59
25%       218.26
50%       543.78
75%      1264.99
max      9941.32
Name: order_total, dtype: float64
Median: 543.78
```

Two things to notice. The count is 343, not 355, because 12 orders have no total, and pandas skips empty values. And the mean (R1 151.83) is more than double the median (R543.78). A few very large orders pull the mean up, so the median is the better "typical order". See [mean vs median](https://thejoinery.dev/#/glossary/term/mean-vs-median).

## 3. Count and get percentages

*About 3 minutes*

`value_counts()` counts each value. Add `normalize=True` to get shares instead of counts, then multiply by 100 for percentages.

```python Python
print(orders["province"].value_counts())
print((orders["province"].value_counts(normalize=True) * 100).round(1))
```

```text Output
province
Gauteng          119
KwaZulu-Natal     68
Western Cape      66
Eastern Cape      26
Limpopo           18
Free State        17
Mpumalanga        17
North West        13
Northern Cape     11
Name: count, dtype: int64
province
Gauteng          33.5
KwaZulu-Natal    19.2
Western Cape     18.6
Eastern Cape      7.3
Limpopo           5.1
Free State        4.8
Mpumalanga        4.8
North West        3.7
Northern Cape     3.1
Name: proportion, dtype: float64
```

A third of all orders (33.5%) come from Gauteng.

## 4. Group and summarise

*About 6 minutes*

This is the step you will use most. `groupby` splits the rows into groups, and `agg` works out one row of numbers per group, exactly like `GROUP BY` in SQL. Each line inside `agg` reads as `new_column=("column", "calculation")`.

```python Python
by_province = (orders
               .groupby("province")
               .agg(orders=("order_id", "count"),
                    revenue=("order_total", "sum"),
                    average_order=("order_total", "mean"))
               .round(2)
               .sort_values("revenue", ascending=False))
print(by_province)
```

> **You should see:** nine provinces, Gauteng first with R136 372.98.

```text Output
               orders    revenue  average_order
province                                       
Gauteng           119  136372.98        1185.85
KwaZulu-Natal      68   82209.51        1284.52
Western Cape       66   79386.47        1221.33
Free State         17   22532.41        1408.28
Eastern Cape       26   21385.30         855.41
Limpopo            18   18253.30        1014.07
North West         13   13842.28        1064.79
Mpumalanga         17   11591.71         724.48
Northern Cape      11    9503.87         863.99
```

Writing the steps one per line inside brackets is called [method chaining](https://thejoinery.dev/#/glossary/term/method-chaining). It reads top to bottom like a recipe. Look at Free State: only 17 orders, but the highest average order. Small groups swing easily, so be careful about reading too much into them.

## 5. Filter first, then group

*About 4 minutes*

To answer a question about part of the data, filter first. `orders["province"] == "Gauteng"` gives True or False for every row (a [boolean mask](https://thejoinery.dev/#/glossary/term/boolean-mask)), and putting it inside `orders[...]` keeps only the True rows.

```python Python
gauteng = orders[orders["province"] == "Gauteng"]
print(len(gauteng))
print(gauteng.groupby("city")["order_id"].count().sort_values(ascending=False).head(5))
```

```text Output
119
city
Pretoria        34
Johannesburg    33
Soweto          13
Benoni          11
Centurion       10
Name: order_id, dtype: int64
```

Pretoria and Johannesburg are neck and neck, and between them make up more than half of Gauteng's 119 orders.

## 6. Work out each group's share

*About 4 minutes*

Add a new column by doing maths on whole columns at once. There is no loop: pandas works through every row for you. This is called a [vectorised operation](https://thejoinery.dev/#/glossary/term/vectorised-operations).

```python Python
by_province["share_of_revenue"] = (by_province["revenue"] / by_province["revenue"].sum() * 100).round(1)
print(by_province[["revenue", "share_of_revenue"]])
```

> **You should see:** the shares add up to 100, with Gauteng on 34.5%.

```text Output
                 revenue  share_of_revenue
province                                  
Gauteng        136372.98              34.5
KwaZulu-Natal   82209.51              20.8
Western Cape    79386.47              20.1
Free State      22532.41               5.7
Eastern Cape    21385.30               5.4
Limpopo         18253.30               4.6
North West      13842.28               3.5
Mpumalanga      11591.71               2.9
Northern Cape    9503.87               2.4
```

So Gauteng places 33.5% of orders but brings in 34.5% of revenue: its orders are about average size.

## What you just did

| Step | The question it answers |
|---|---|
| `describe()` and `median()` | What does a typical value look like? |
| `value_counts()` | How often does each value appear? |
| `groupby` and `agg` | What are the totals for each group? |
| A boolean mask | What about just this part of the data? |
| A calculated column | What share does each group make up? |

**Say it in an interview:** "I start with describe and value counts to get a feel for the data, then use groupby to answer the actual question, and I check group sizes before I read anything into an average."

**Next:** [Merge tables without double counting](https://thejoinery.dev/#/projects/python-merge), or practise the same ideas in SQL in [Just Now Deliveries](https://thejoinery.dev/#/projects/just-now-deliveries).

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.
