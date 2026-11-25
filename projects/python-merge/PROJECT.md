# Merge tables without double counting

*Python practice. About 25 minutes, nothing to install and nothing to download.*

## Before you start

Real data comes in several tables. Here you have three: orders, customers, and the items inside each order. You will join them with `merge`, the pandas version of a SQL join, and learn the one mistake that quietly doubles totals.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-merge/python-merge.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the practice files straight from The Joinery, so there is nothing to download or upload.

## 1. Read the three tables

*About 2 minutes*

```python Python
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/"
orders = pd.read_csv(BASE + "orders.csv")
customers = pd.read_csv(BASE + "customers.csv")
items = pd.read_csv(BASE + "order_items.csv")
print("orders", orders.shape)
print("customers", customers.shape)
print("items", items.shape)
```

```text Output
orders (355, 8)
customers (344, 3)
items (500, 5)
```

There are 355 orders but 500 items, so some orders must hold more than one item. Keep that in mind.

## 2. Check the keys first

*About 4 minutes*

A key is the column you join on. Before any merge, check whether each key is unique in its table. `is_unique` answers True or False.

```python Python
print(orders["order_id"].is_unique)
print(customers["customer_id"].is_unique)
print(items["order_id"].is_unique)
print(items["order_id"].value_counts().head(3))
```

> **You should see:** `True`, `True`, `False`, and orders with four items each.

```text Output
True
True
False
order_id
O036223    4
O015000    4
O013588    4
Name: count, dtype: int64
```

Each order and each customer appears once, but one order can have up to four items. This tells you the [grain](https://thejoinery.dev/#/glossary/term/grain) of each table: one row per order, per customer, and per item.

## 3. Left merge: keep every order

*About 4 minutes*

`how="left"` keeps every row from the left table (orders) and adds customer details where it finds a match. `indicator=True` adds a `_merge` column that says where each row found a match.

```python Python
with_customers = orders.merge(customers, on="customer_id", how="left", indicator=True)
print(with_customers.shape)
print(with_customers["_merge"].value_counts())
```

```text Output
(355, 11)
_merge
both          352
left_only       3
right_only      0
Name: count, dtype: int64
```

Three orders belong to customers missing from the customers file. A left merge keeps them, with empty customer details, so nothing disappears quietly. See [left join](https://thejoinery.dev/#/glossary/term/left-join).

## 4. Inner merge: only the matches

*About 3 minutes*

`how="inner"` keeps only rows that match on both sides.

```python Python
inner = orders.merge(customers, on="customer_id", how="inner")
print(len(orders), len(with_customers), len(inner))
```

> **You should see:** `355 355 352`

```text Output
355 355 352
```

The inner merge dropped three orders without any warning. Compare row counts before and after every merge, so you notice when that happens. See [inner join](https://thejoinery.dev/#/glossary/term/inner-join).

## 5. Watch the totals grow

*About 4 minutes*

Now merge orders with items, and add up the order totals before and after.

```python Python
print(round(orders["order_total"].sum(), 2))
joined = orders.merge(items, on="order_id", how="left")
print(joined.shape)
print(round(joined["order_total"].sum(), 2))
```

```text Output
395077.83
(500, 12)
747838.49
```

Total revenue jumped from R395 077.83 to R747 838.49, with no new sales. Each order's total was copied onto every one of its items, so an order with four items was counted four times. This is called [fan-out](https://thejoinery.dev/#/glossary/term/fan-out), and it is the most common way a correct-looking report ends up wrong.

## 6. Fix it: summarise first, then merge

*About 5 minutes*

Bring the items to the same grain as orders (one row per order) before you merge. `validate="one_to_one"` tells pandas to stop with an error if that is not true.

```python Python
per_order = (items
             .groupby("order_id")
             .agg(items=("item_number", "count"), items_total=("price", "sum"))
             .reset_index())
orders_with_items = orders.merge(per_order, on="order_id", how="left", validate="one_to_one")
print(orders_with_items.shape)
print(round(orders_with_items["order_total"].sum(), 2))
print(orders_with_items[["order_id", "order_total", "items", "items_total"]].head())
```

> **You should see:** 355 rows, and the total back to R395 077.83.

```text Output
(355, 10)
395077.83
  order_id  order_total  items  items_total
0  O044903       320.44      1       320.44
1  O028861       905.38      2       905.38
2  O017405       437.74      1       437.74
3  O037430        86.99      1        86.99
4  O039752      1514.99      1      1514.99
```

Here is what `validate` does when the grain is wrong. `try` and `except` catch the error, so you can read it without the notebook stopping:

```python Python
try:
    orders.merge(items, on="order_id", validate="one_to_one")
except pd.errors.MergeError as problem:
    print("Stopped:", problem)
```

```text Output
Stopped: Merge keys are not unique in right dataset; not a one-to-one merge
```

## 7. Answer item questions from the items table

*About 3 minutes*

For questions about products, such as revenue by category, use the items table on its own. Its grain is one row per item, so nothing is copied.

```python Python
by_category = items.groupby("category")["price"].sum().round(2).sort_values(ascending=False)
print(by_category)
```

```text Output
category
Electronics             165712.46
Braai and outdoor        56410.56
Home and kitchen         45892.23
Sport and fitness        33900.33
Fashion                  24402.37
Toys and games           21458.38
Garden                   18697.98
Pet supplies             15497.70
Beauty                   14730.59
Books and stationery      5844.84
Name: price, dtype: float64
```

Electronics brings in the most by far.

## What you just did

| Habit | What it protects |
|---|---|
| Check keys with `is_unique` | You know the grain before you join |
| Left merge with `indicator=True` | Nothing disappears without you seeing it |
| Compare row counts and totals | You spot dropped rows and fan-out |
| Summarise to the same grain, then merge | Totals stay right |
| `validate=` | pandas stops you if the grain is wrong |

**Say it in an interview:** "Before I join, I check the grain of both tables. If one side has many rows per key, I aggregate first, then compare row counts and totals before and after, so fan-out cannot inflate the numbers."

**Next:** [Work with dates](https://thejoinery.dev/#/projects/python-dates). The same fan-out trap comes up in SQL in [Just Now Deliveries](https://thejoinery.dev/#/projects/just-now-deliveries).

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.
