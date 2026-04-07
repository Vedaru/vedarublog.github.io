---
title: Cpp Reference
published: 2026-04-07
tags: [备忘]
category: 编程
draft: false
---

# C++常用库、类与对象、友元、继承参考手册

## 1. 常用标准库

### 1.1 iostream

`iostream`库提供了用于标准输入/输出流的对象，例如控制台输入输出。它包含以下主要对象：

| 对象 | 描述 |
|---|---|
| `cin` | 标准输入流，默认从键盘读取输入。 |
| `cout` | 标准输出流，默认向控制台输出。 |
| `cerr` | 标准错误流，用于输出错误信息，不缓冲。 |
| `clog` | 标准日志流，用于输出日志信息，带缓冲。 |

**使用方法和示例：**

```cpp
#include <iostream>
#include <string>

int main() {
    // 使用cout输出
    std::cout << "Hello, World!" << std::endl; // std::endl用于换行并刷新缓冲区

    // 使用cin输入
    int age;
    std::cout << "请输入您的年龄: ";
    std::cin >> age;
    std::cout << "您的年龄是: " << age << std::endl;

    // 结合string使用cin读取字符串（遇到空格或换行符停止）
    std::string name;
    std::cout << "请输入您的名字 (单字): ";
    std::cin >> name;
    std::cout << "您的名字是: " << name << std::endl;

    // 读取包含空格的行，需要使用std::getline
    std::string full_name;
    std::cout << "请输入您的全名: ";
    std::cin.ignore(); // 忽略之前输入留下的换行符
    std::getline(std::cin, full_name);
    std::cout << "您的全名是: " << full_name << std::endl;

    // 使用cerr输出错误信息
    std::cerr << "这是一个错误信息！" << std::endl;

    // 使用clog输出日志信息
    std::clog << "这是一个日志信息。" << std::endl;

    return 0;
}
```


### 1.2 string

`string`库提供了`std::string`类，用于处理可变长度的字符串。与C风格字符串（`char`数组）相比，`std::string`提供了更安全、更方便的字符串操作。

**常用函数和示例：**

| 函数/操作符 | 描述 |
|---|---|
| `std::string s;` | 默认构造函数，创建一个空字符串。 |
| `std::string s = "hello";` | 构造函数，用C风格字符串初始化。 |
| `s.length()` / `s.size()` | 返回字符串的长度。 |
| `s.empty()` | 检查字符串是否为空。 |
| `s.append(str)` / `s += str` | 在字符串末尾追加另一个字符串。 |
| `s.push_back(char)` | 在字符串末尾追加一个字符。 |
| `s.pop_back()` | 删除字符串末尾的字符。 |
| `s.insert(pos, str)` | 在指定位置插入字符串。 |
| `s.erase(pos, len)` | 删除从指定位置开始的指定长度的字符。 |
| `s.substr(pos, len)` | 返回从指定位置开始的指定长度的子字符串。 |
| `s.find(str)` | 查找子字符串第一次出现的位置。如果未找到，返回`std::string::npos`。 |
| `s.replace(pos, len, str)` | 替换从指定位置开始的指定长度的字符。 |
| `s[i]` | 访问指定索引处的字符。 |
| `std::getline(std::cin, s)` | 从输入流中读取一行字符串（包括空格）。 |
| `s1 + s2` | 连接两个字符串。 |

**示例：**

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s1 = "Hello";
    std::string s2 = " World";

    // 字符串连接
    std::string s3 = s1 + s2;
    std::cout << "连接后的字符串: " << s3 << std::endl; // 输出: Hello World

    // 追加字符串
    s1.append(" C++");
    std::cout << "追加后的字符串: " << s1 << std::endl; // 输出: Hello C++

    // 获取字符串长度
    std::cout << "s1的长度: " << s1.length() << std::endl; // 输出: 9

    // 访问字符
    std::cout << "s1的第一个字符: " << s1[0] << std::endl; // 输出: H

    // 查找子字符串
    size_t pos = s1.find("C++");
    if (pos != std::string::npos) {
        std::cout << "找到'C++'的位置: " << pos << std::endl; // 输出: 找到'C++'的位置: 6
    }

    // 提取子字符串
    std::string sub = s1.substr(0, 5);
    std::cout << "提取的子字符串: " << sub << std::endl; // 输出: Hello

    // 替换子字符串
    s1.replace(6, 3, "Programming");
    std::cout << "替换后的字符串: " << s1 << std::endl; // 输出: Hello Programming

    // 插入字符串
    s1.insert(5, ",");
    std::cout << "插入后的字符串: " << s1 << std::endl; // 输出: Hello, Programming

    // 删除字符
    s1.erase(5, 1); // 删除逗号
    std::cout << "删除后的字符串: " << s1 << std::endl; // 输出: Hello Programming

    // 检查是否为空
    std::string empty_s;
    if (empty_s.empty()) {
        std::cout << "empty_s是空的" << std::endl;
    }

    // push_back 和 pop_back
    std::string pb_test = "abc";
    pb_test.push_back('d');
    std::cout << "push_back后: " << pb_test << std::endl; // 输出: abcd
    pb_test.pop_back();
    std::cout << "pop_back后: " << pb_test << std::endl; // 输出: abc

    return 0;
}
```


### 1.3 vector

`vector`是C++标准模板库（STL）中的一个动态数组，它可以自动调整大小。它提供了比C风格数组更安全、更灵活的功能。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::vector<T> v;` | 默认构造函数，创建一个空vector。 |
| `std::vector<T> v(size);` | 创建一个包含`size`个默认初始化元素的vector。 |
| `std::vector<T> v(size, value);` | 创建一个包含`size`个值为`value`的元素的vector。 |
| `v.push_back(value)` | 在vector末尾添加一个元素。平均时间复杂度O(1)。 |
| `v.pop_back()` | 删除vector末尾的元素。时间复杂度O(1)。 |
| `v.insert(position, value)` | 在指定位置插入一个元素。时间复杂度O(n)。 |
| `v.erase(position)` | 删除指定位置的元素。时间复杂度O(n)。 |
| `v.clear()` | 删除所有元素，使vector变为空。 |
| `v.size()` | 返回vector中元素的数量。 |
| `v.empty()` | 检查vector是否为空。 |
| `v[index]` | 访问指定索引处的元素（不进行边界检查）。 |
| `v.at(index)` | 访问指定索引处的元素（进行边界检查，越界会抛出异常）。 |
| `v.begin()` | 返回指向第一个元素的迭代器。 |
| `v.end()` | 返回指向最后一个元素之后位置的迭代器。 |

**示例：**

```cpp
#include <iostream>
#include <vector>
#include <algorithm> // 用于std::find

int main() {
    // 声明并初始化一个vector
    std::vector<int> numbers = {10, 20, 30, 40, 50};

    std::cout << "原始vector: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 添加元素
    numbers.push_back(60);
    std::cout << "添加60后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 访问元素
    std::cout << "索引2处的元素 (使用[]): " << numbers[2] << std::endl; // 输出: 30
    std::cout << "索引0处的元素 (使用at()): " << numbers.at(0) << std::endl; // 输出: 10

    // 修改元素
    numbers[1] = 25;
    std::cout << "修改索引1处的元素后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 插入元素
    numbers.insert(numbers.begin() + 1, 15); // 在索引1处插入15
    std::cout << "插入15后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 删除元素
    numbers.pop_back(); // 删除最后一个元素
    std::cout << "删除最后一个元素后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 删除指定值的元素 (需要先查找)
    auto it = std::find(numbers.begin(), numbers.end(), 30);
    if (it != numbers.end()) {
        numbers.erase(it);
    }
    std::cout << "删除30后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 获取大小和检查是否为空
    std::cout << "vector的大小: " << numbers.size() << std::endl;
    if (numbers.empty()) {
        std::cout << "vector为空" << std::endl;
    } else {
        std::cout << "vector不为空" << std::endl;
    }

    // 清空vector
    numbers.clear();
    std::cout << "清空后vector的大小: " << numbers.size() << std::endl;

    // 多维vector (例如2D vector)
    std::vector<std::vector<int>> matrix = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };
    std::cout << "\n2D Vector:\n";
    for (const auto& row : matrix) {
        for (int val : row) {
            std::cout << val << " ";
        }
        std::cout << std::endl;
    }

    return 0;
}
```


### 1.4 map

`map`是C++ STL中的一种关联容器，它存储键-值对（key-value pairs），并根据键的顺序进行排序。`map`中的键是唯一的。

**常用函数和示例：**

| 函数/操作符 | 描述 |
|---|---|
| `std::map<Key, Value> m;` | 默认构造函数，创建一个空的map。 |
| `m.insert({key, value})` | 插入一个键-值对。如果键已存在，则不进行插入。时间复杂度O(log n)。 |
| `m[key] = value` | 插入或更新一个键-值对。如果键不存在，则插入；如果键已存在，则更新其值。时间复杂度O(log n)。 |
| `m.at(key)` | 访问指定键的值。如果键不存在，则抛出`std::out_of_range`异常。时间复杂度O(log n)。 |
| `m.find(key)` | 查找指定键。如果找到，返回指向该键-值对的迭代器；否则，返回`m.end()`。时间复杂度O(log n)。 |
| `m.count(key)` | 返回指定键出现的次数（对于`map`，只能是0或1）。时间复杂度O(log n)。 |
| `m.erase(key)` | 删除指定键的键-值对。时间复杂度O(log n)。 |
| `m.size()` | 返回map中元素的数量。 |
| `m.empty()` | 检查map是否为空。 |
| `m.begin()` | 返回指向第一个元素的迭代器。 |
| `m.end()` | 返回指向最后一个元素之后位置的迭代器。 |

**示例：**

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    // 声明并初始化一个map
    std::map<int, std::string> students;

    // 插入元素
    students.insert({101, "Alice"});
    students[102] = "Bob"; // 使用[]操作符插入
    students.insert(std::make_pair(103, "Charlie"));

    std::cout << "原始map中的元素:\n";
    for (const auto& pair : students) {
        std::cout << pair.first << ": " << pair.second << std::endl;
    }

    // 访问元素
    std::cout << "\n学号102的学生: " << students[102] << std::endl; // 输出: Bob
    std::cout << "学号101的学生 (使用at()): " << students.at(101) << std::endl; // 输出: Alice

    // 更新元素
    students[102] = "Bobby";
    std::cout << "更新学号102的学生后: " << students[102] << std::endl; // 输出: Bobby

    // 查找元素
    auto it = students.find(103);
    if (it != students.end()) {
        std::cout << "\n找到学号103的学生: " << it->second << std::endl; // 输出: Charlie
    } else {
        std::cout << "未找到学号103的学生" << std::endl;
    }

    // 检查键是否存在
    if (students.count(104)) {
        std::cout << "学号104存在" << std::endl;
    } else {
        std::cout << "学号104不存在" << std::endl;
    }

    // 删除元素
    students.erase(101);
    std::cout << "\n删除学号101后map中的元素:\n";
    for (const auto& pair : students) {
        std::cout << pair.first << ": " << pair.second << std::endl;
    }

    // 获取大小和检查是否为空
    std::cout << "\nmap的大小: " << students.size() << std::endl;
    if (students.empty()) {
        std::cout << "map为空" << std::endl;
    } else {
        std::cout << "map不为空" << std::endl;
    }

    return 0;
}
```


### 1.5 set

`set`是C++ STL中的一种关联容器，它存储唯一的元素，并按照特定顺序（默认是升序）进行排序。`set`的底层实现通常是红黑树，这保证了插入、删除和查找操作的平均时间复杂度为O(log n)。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::set<T> s;` | 默认构造函数，创建一个空的set。 |
| `s.insert(value)` | 插入一个元素。如果元素已存在，则不进行插入。时间复杂度O(log n)。 |
| `s.erase(value)` | 删除指定值的元素。时间复杂度O(log n)。 |
| `s.find(value)` | 查找指定值的元素。如果找到，返回指向该元素的迭代器；否则，返回`s.end()`。时间复杂度O(log n)。 |
| `s.count(value)` | 返回指定值出现的次数（对于`set`，只能是0或1）。时间复杂度O(log n)。 |
| `s.size()` | 返回set中元素的数量。 |
| `s.empty()` | 检查set是否为空。 |
| `s.begin()` | 返回指向第一个元素的迭代器。 |
| `s.end()` | 返回指向最后一个元素之后位置的迭代器。 |

**示例：**

```cpp
#include <iostream>
#include <set>
#include <algorithm>

int main() {
    // 声明并初始化一个set
    std::set<int> uniqueNumbers;

    // 插入元素
    uniqueNumbers.insert(30);
    uniqueNumbers.insert(10);
    uniqueNumbers.insert(20);
    uniqueNumbers.insert(30); // 重复元素不会被插入

    std::cout << "原始set中的元素 (已排序且唯一): ";
    for (int n : uniqueNumbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl; // 输出: 10 20 30

    // 查找元素
    auto it = uniqueNumbers.find(20);
    if (it != uniqueNumbers.end()) {
        std::cout << "\n找到元素: " << *it << std::endl; // 输出: 20
    } else {
        std::cout << "未找到元素20" << std::endl;
    }

    // 检查元素是否存在
    if (uniqueNumbers.count(10)) {
        std::cout << "元素10存在于set中" << std::endl;
    } else {
        std::cout << "元素10不存在于set中" << std::endl;
    }

    // 删除元素
    uniqueNumbers.erase(10);
    std::cout << "删除10后set中的元素: ";
    for (int n : uniqueNumbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl; // 输出: 20 30

    // 获取大小和检查是否为空
    std::cout << "\nset的大小: " << uniqueNumbers.size() << std::endl; // 输出: 2
    if (uniqueNumbers.empty()) {
        std::cout << "set为空" << std::endl;
    } else {
        std::cout << "set不为空" << std::endl;
    }

    // 清空set
    uniqueNumbers.clear();
    std::cout << "清空后set的大小: " << uniqueNumbers.size() << std::endl; // 输出: 0

    return 0;
}
```


### 1.6 algorithm

`algorithm`库提供了大量用于处理序列（如数组、vector、list等）的函数，包括排序、搜索、变换、修改等。这些函数通常作用于迭代器范围。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::sort(begin, end)` | 对指定范围内的元素进行升序排序。 |
| `std::reverse(begin, end)` | 反转指定范围内的元素顺序。 |
| `std::find(begin, end, value)` | 在指定范围内查找第一个匹配`value`的元素。 |
| `std::min_element(begin, end)` | 查找指定范围内最小的元素。 |
| `std::max_element(begin, end)` | 查找指定范围内最大的元素。 |
| `std::count(begin, end, value)` | 统计指定范围内`value`出现的次数。 |
| `std::for_each(begin, end, func)` | 对指定范围内的每个元素应用函数`func`。 |
| `std::copy(begin, end, dest_begin)` | 将指定范围内的元素复制到另一个位置。 |
| `std::unique(begin, end)` | 移除指定范围内连续的重复元素（需要先排序）。 |
| `std::lower_bound(begin, end, value)` | 在有序范围内查找第一个不小于`value`的元素。 |
| `std::upper_bound(begin, end, value)` | 在有序范围内查找第一个大于`value`的元素。 |

**示例：**

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric> // For std::iota

int main() {
    std::vector<int> numbers = {5, 2, 8, 2, 1, 9, 4, 7, 6, 3};

    std::cout << "原始vector: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 排序
    std::sort(numbers.begin(), numbers.end());
    std::cout << "排序后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 反转
    std::reverse(numbers.begin(), numbers.end());
    std::cout << "反转后: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // 查找元素
    auto it_find = std::find(numbers.begin(), numbers.end(), 5);
    if (it_find != numbers.end()) {
        std::cout << "找到元素5在索引: " << std::distance(numbers.begin(), it_find) << std::endl;
    }

    // 查找最大/最小元素
    auto it_min = std::min_element(numbers.begin(), numbers.end());
    auto it_max = std::max_element(numbers.begin(), numbers.end());
    std::cout << "最小元素: " << *it_min << std::endl;
    std::cout << "最大元素: " << *it_max << std::endl;

    // 统计元素出现次数
    int count_2 = std::count(numbers.begin(), numbers.end(), 2);
    std::cout << "元素2出现的次数: " << count_2 << std::endl;

    // for_each
    std::cout << "for_each打印: ";
    std::for_each(numbers.begin(), numbers.end(), [](int n){ std::cout << n * 2 << " "; });
    std::cout << std::endl;

    // unique (需要先排序)
    std::vector<int> duplicates = {1, 1, 2, 2, 2, 3, 4, 4, 5};
    std::sort(duplicates.begin(), duplicates.end());
    auto last = std::unique(duplicates.begin(), duplicates.end());
    duplicates.erase(last, duplicates.end());
    std::cout << "移除连续重复元素后: ";
    for (int n : duplicates) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    // lower_bound 和 upper_bound (需要有序)
    std::vector<int> sorted_numbers = {1, 2, 3, 3, 3, 4, 5};
    auto lb = std::lower_bound(sorted_numbers.begin(), sorted_numbers.end(), 3);
    auto ub = std::upper_bound(sorted_numbers.begin(), sorted_numbers.end(), 3);
    std::cout << "3的lower_bound索引: " << std::distance(sorted_numbers.begin(), lb) << std::endl;
    std::cout << "3的upper_bound索引: " << std::distance(sorted_numbers.begin(), ub) << std::endl;

    return 0;
}
```


### 1.7 cmath

`cmath`库提供了许多用于执行数学运算的函数，如三角函数、指数函数、对数函数、舍入函数等。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::abs(x)` | 返回x的绝对值。 |
| `std::pow(x, y)` | 返回x的y次幂。 |
| `std::sqrt(x)` | 返回x的平方根。 |
| `std::cbrt(x)` | 返回x的立方根。 |
| `std::exp(x)` | 返回e的x次幂。 |
| `std::log(x)` | 返回x的自然对数（以e为底）。 |
| `std::log10(x)` | 返回x的以10为底的对数。 |
| `std::sin(x)` | 返回x（弧度）的正弦值。 |
| `std::cos(x)` | 返回x（弧度）的余弦值。 |
| `std::tan(x)` | 返回x（弧度）的正切值。 |
| `std::asin(x)` | 返回x的反正弦值（弧度）。 |
| `std::acos(x)` | 返回x的反余弦值（弧度）。 |
| `std::atan(x)` | 返回x的反正切值（弧度）。 |
| `std::ceil(x)` | 返回大于或等于x的最小整数（向上取整）。 |
| `std::floor(x)` | 返回小于或等于x的最大整数（向下取整）。 |
| `std::round(x)` | 返回最接近x的整数（四舍五入）。 |
| `std::trunc(x)` | 返回x的整数部分（截断小数部分）。 |
| `std::fmod(x, y)` | 返回x除以y的浮点余数。 |

**示例：**

```cpp
#include <iostream>
#include <cmath>

int main() {
    double x = -5.5;
    double y = 2.0;

    // 绝对值
    std::cout << "abs(" << x << ") = " << std::abs(x) << std::endl;

    // 幂运算
    std::cout << "pow(" << x << ", " << y << ") = " << std::pow(x, y) << std::endl;

    // 平方根
    std::cout << "sqrt(" << std::abs(x) << ") = " << std::sqrt(std::abs(x)) << std::endl;

    // 立方根
    std::cout << "cbrt(" << x << ") = " << std::cbrt(x) << std::endl;

    // 指数和对数
    std::cout << "exp(" << y << ") = " << std::exp(y) << std::endl;
    std::cout << "log(" << std::exp(y) << ") = " << std::log(std::exp(y)) << std::endl;
    std::cout << "log10(100) = " << std::log10(100) << std::endl;

    // 三角函数 (参数为弧度)
    double pi = 3.14159265358979323846;
    std::cout << "sin(pi/2) = " << std::sin(pi / 2) << std::endl;
    std::cout << "cos(pi) = " << std::cos(pi) << std::endl;
    std::cout << "tan(pi/4) = " << std::tan(pi / 4) << std::endl;

    // 反三角函数
    std::cout << "asin(1) = " << std::asin(1) << " 弧度" << std::endl;
    std::cout << "acos(-1) = " << std::acos(-1) << " 弧度" << std::endl;
    std::cout << "atan(1) = " << std::atan(1) << " 弧度" << std::endl;

    // 舍入函数
    double z = 3.7;
    std::cout << "ceil(" << z << ") = " << std::ceil(z) << std::endl;
    std::cout << "floor(" << z << ") = " << std::floor(z) << std::endl;
    std::cout << "round(" << z << ") = " << std::round(z) << std::endl;
    std::cout << "trunc(" << z << ") = " << std::trunc(z) << std::endl;

    // 浮点余数
    std::cout << "fmod(5.5, 2.0) = " << std::fmod(5.5, 2.0) << std::endl;

    return 0;
}
```


### 1.8 cstring

`cstring`库提供了处理C风格字符串（即字符数组）的函数。这些函数通常用于操作以空字符`\0`结尾的字符数组。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::strlen(s)` | 返回C风格字符串`s`的长度（不包括空终止符）。 |
| `std::strcpy(dest, src)` | 将`src`指向的字符串复制到`dest`指向的数组。 |
| `std::strncpy(dest, src, n)` | 将`src`指向的字符串的前`n`个字符复制到`dest`指向的数组。 |
| `std::strcat(dest, src)` | 将`src`指向的字符串连接到`dest`指向的字符串的末尾。 |
| `std::strncat(dest, src, n)` | 将`src`指向的字符串的前`n`个字符连接到`dest`指向的字符串的末尾。 |
| `std::strcmp(s1, s2)` | 比较两个C风格字符串`s1`和`s2`。如果相等返回0，`s1`大于`s2`返回正数，`s1`小于`s2`返回负数。 |
| `std::strncmp(s1, s2, n)` | 比较两个C风格字符串`s1`和`s2`的前`n`个字符。 |
| `std::strchr(s, c)` | 在字符串`s`中查找字符`c`第一次出现的位置。 |
| `std::strrchr(s, c)` | 在字符串`s`中查找字符`c`最后一次出现的位置。 |
| `std::strstr(haystack, needle)` | 在字符串`haystack`中查找子字符串`needle`第一次出现的位置。 |
| `std::memset(ptr, value, num)` | 将`ptr`指向的内存区域的前`num`个字节设置为指定`value`。 |
| `std::memcpy(dest, src, num)` | 从`src`复制`num`个字节到`dest`。 |
| `std::memmove(dest, src, num)` | 从`src`复制`num`个字节到`dest`，处理内存区域重叠的情况。 |

**示例：**

```cpp
#include <iostream>
#include <cstring> // 包含C风格字符串函数

int main() {
    char str1[50] = "Hello";
    char str2[50] = " World";
    char str3[50];

    // strlen: 获取字符串长度
    std::cout << "str1的长度: " << std::strlen(str1) << std::endl; // 输出: 5

    // strcpy: 复制字符串
    std::strcpy(str3, str1);
    std::cout << "str3 (复制str1): " << str3 << std::endl; // 输出: Hello

    // strcat: 连接字符串
    std::strcat(str1, str2);
    std::cout << "str1 (连接str2后): " << str1 << std::endl; // 输出: Hello World

    // strcmp: 比较字符串
    char s_cmp1[] = "apple";
    char s_cmp2[] = "banana";
    char s_cmp3[] = "apple";
    std::cout << "strcmp(apple, banana): " << std::strcmp(s_cmp1, s_cmp2) << std::endl; // 输出: 负数
    std::cout << "strcmp(apple, apple): " << std::strcmp(s_cmp1, s_cmp3) << std::endl; // 输出: 0

    // strchr: 查找字符
    char* pch = std::strchr(str1, 'o');
    if (pch != nullptr) {
        std::cout << "在str1中找到'o'的位置: " << pch - str1 << std::endl; // 输出: 4
    }

    // strstr: 查找子字符串
    char* psub = std::strstr(str1, "World");
    if (psub != nullptr) {
        std::cout << "在str1中找到'World'的位置: " << psub - str1 << std::endl; // 输出: 6
    }

    // memset: 填充内存
    char buffer[10];
    std::memset(buffer, 'A', sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0'; // 添加空终止符
    std::cout << "memset填充后的buffer: " << buffer << std::endl; // 输出: AAAAAAAAA

    // memcpy: 复制内存
    char src_mem[] = "Test Data";
    char dest_mem[20];
    std::memcpy(dest_mem, src_mem, std::strlen(src_mem) + 1); // +1 复制空终止符
    std::cout << "memcpy复制后的dest_mem: " << dest_mem << std::endl; // 输出: Test Data

    return 0;
}
```


### 1.8 cstring

`cstring`库提供了处理C风格字符串（即字符数组）的函数。这些函数通常用于操作以空字符`\0`结尾的字符数组。

**常用函数和示例：**

| 函数 | 描述 |
|---|---|
| `std::strlen(s)` | 返回C风格字符串`s`的长度（不包括空终止符）。 |
| `std::strcpy(dest, src)` | 将`src`指向的字符串复制到`dest`指向的数组。 |
| `std::strncpy(dest, src, n)` | 将`src`指向的字符串的前`n`个字符复制到`dest`指向的数组。 |
| `std::strcat(dest, src)` | 将`src`指向的字符串连接到`dest`指向的字符串的末尾。 |
| `std::strncat(dest, src, n)` | 将`src`指向的字符串的前`n`个字符连接到`dest`指向的字符串的末尾。 |
| `std::strcmp(s1, s2)` | 比较两个C风格字符串`s1`和`s2`。如果相等返回0，`s1`大于`s2`返回正数，`s1`小于`s2`返回负数。 |
| `std::strncmp(s1, s2, n)` | 比较两个C风格字符串`s1`和`s2`的前`n`个字符。 |
| `std::strchr(s, c)` | 在字符串`s`中查找字符`c`第一次出现的位置。 |
| `std::strrchr(s, c)` | 在字符串`s`中查找字符`c`最后一次出现的位置。 |
| `std::strstr(haystack, needle)` | 在字符串`haystack`中查找子字符串`needle`第一次出现的位置。 |
| `std::memset(ptr, value, num)` | 将`ptr`指向的内存区域的前`num`个字节设置为指定`value`。 |
| `std::memcpy(dest, src, num)` | 从`src`复制`num`个字节到`dest`。 |
| `std::memmove(dest, src, num)` | 从`src`复制`num`个字节到`dest`，处理内存区域重叠的情况。 |

**示例：**

```cpp
#include <iostream>
#include <cstring> // 包含C风格字符串函数

int main() {
    char str1[50] = "Hello";
    char str2[50] = " World";
    char str3[50];

    // strlen: 获取字符串长度
    std::cout << "str1的长度: " << std::strlen(str1) << std::endl; // 输出: 5

    // strcpy: 复制字符串
    std::strcpy(str3, str1);
    std::cout << "str3 (复制str1): " << str3 << std::endl; // 输出: Hello

    // strcat: 连接字符串
    std::strcat(str1, str2);
    std::cout << "str1 (连接str2后): " << str1 << std::endl; // 输出: Hello World

    // strcmp: 比较字符串
    char s_cmp1[] = "apple";
    char s_cmp2[] = "banana";
    char s_cmp3[] = "apple";
    std::cout << "strcmp(apple, banana): " << std::strcmp(s_cmp1, s_cmp2) << std::endl; // 输出: 负数
    std::cout << "strcmp(apple, apple): " << std::strcmp(s_cmp1, s_cmp3) << std::endl; // 输出: 0

    // strchr: 查找字符
    char* pch = std::strchr(str1, 'o');
    if (pch != nullptr) {
        std::cout << "在str1中找到'o'的位置: " << pch - str1 << std::endl; // 输出: 4
    }

    // strstr: 查找子字符串
    char* psub = std::strstr(str1, "World");
    if (psub != nullptr) {
        std::cout << "在str1中找到'World'的位置: " << psub - str1 << std::endl; // 输出: 6
    }

    // memset: 填充内存
    char buffer[10];
    std::memset(buffer, 'A', sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0'; // 添加空终止符
    std::cout << "memset填充后的buffer: " << buffer << std::endl; // 输出: AAAAAAAAA

    // memcpy: 复制内存
    char src_mem[] = "Test Data";
    char dest_mem[20];
    std::memcpy(dest_mem, src_mem, std::strlen(src_mem) + 1); // +1 复制空终止符
    std::cout << "memcpy复制后的dest_mem: " << dest_mem << std::endl; // 输出: Test Data

    return 0;
}
```


## 2. 类与对象

C++是一种面向对象的编程语言，**类（Class）**是创建对象的蓝图，而**对象（Object）**是类的实例。类定义了对象的属性（数据成员）和行为（成员函数）。

### 2.1 类的定义

类使用`class`关键字定义，通常包含数据成员和成员函数。访问修饰符（`public`, `private`, `protected`）用于控制成员的访问权限。

**示例：**

```cpp
#include <string>

class MyClass {
public: // 公有成员，可在类外部访问
    int myNum;       // 属性 (数据成员)
    std::string myString; // 属性 (数据成员)

    // 成员函数 (方法)
    void myMethod() {
        // 方法体
        myNum = 10;
        myString = "Hello";
    }

private: // 私有成员，只能在类内部访问
    double secretValue;

protected: // 保护成员，可在类内部和派生类中访问
    int protectedValue;
};
```

### 2.2 对象的创建与访问

通过类可以创建多个对象，每个对象都有自己独立的数据成员副本。通过`.`运算符可以访问对象的公有成员。

**示例：**

```cpp
#include <iostream>
#include <string>

class Car {
public:
    std::string brand;
    std::string model;
    int year;

    void displayCarInfo() {
        std::cout << "品牌: " << brand << ", 型号: " << model << ", 年份: " << year << std::endl;
    }
};

int main() {
    // 创建Car类的对象
    Car carObj1;
    carObj1.brand = "BMW";
    carObj1.model = "X5";
    carObj1.year = 1999;

    Car carObj2;
    carObj2.brand = "Ford";
    carObj2.model = "Mustang";
    carObj2.year = 1969;

    // 访问并打印对象属性
    std::cout << carObj1.brand << " " << carObj1.model << " " << carObj1.year << std::endl;
    std::cout << carObj2.brand << " " << carObj2.model << " " << carObj2.year << std::endl;

    // 调用成员函数
    carObj1.displayCarInfo();

    return 0;
}
```

### 2.3 构造函数

**构造函数（Constructor）**是一种特殊的成员函数，它在创建对象时自动调用。构造函数没有返回类型，并且其名称与类名相同。它可以用于初始化对象的成员。

**示例：**

```cpp
#include <iostream>
#include <string>

class MyClass {
public:
    int x;

    // 默认构造函数
    MyClass() {
        x = 0;
        std::cout << "默认构造函数被调用" << std::endl;
    }

    // 带参数的构造函数
    MyClass(int val) {
        x = val;
        std::cout << "带参数的构造函数被调用，x = " << x << std::endl;
    }
};

int main() {
    MyClass obj1;      // 调用默认构造函数
    MyClass obj2(100); // 调用带参数的构造函数

    return 0;
}
```

### 2.4 析构函数

**析构函数（Destructor）**也是一种特殊的成员函数，它在对象被销毁时自动调用。析构函数没有返回类型，没有参数，并且其名称是类名前加上波浪号（`~`）。它通常用于释放对象在生命周期内分配的资源。

**示例：**

```cpp
#include <iostream>

class MyClass {
public:
    MyClass() {
        std::cout << "构造函数被调用" << std::endl;
    }

    ~MyClass() {
        std::cout << "析构函数被调用" << std::endl;
    }
};

int main() {
    MyClass obj1; // obj1在main函数结束时被销毁，调用析构函数
    {
        MyClass obj2; // obj2在代码块结束时被销毁，调用析构函数
    }
    return 0;
}
```

### 2.5 访问控制

C++提供了三种访问修饰符来控制类成员的访问权限：

*   **`public`**: 公有成员可以在类的任何地方访问，包括类外部。
*   **`private`**: 私有成员只能在类的内部访问。这是默认的访问级别。
*   **`protected`**: 保护成员可以在类的内部以及其派生类中访问。

**示例：**

```cpp
#include <iostream>
#include <string>

class Employee {
private:
    int salary; // 私有成员，只能在类内部访问

public:
    std::string name; // 公有成员，可在类外部访问

    void setSalary(int s) {
        salary = s;
    }

    int getSalary() {
        return salary;
    }

protected:
    std::string department; // 保护成员，可在派生类中访问
};

class Manager : public Employee {
public:
    void setDepartment(const std::string& dept) {
        department = dept; // 派生类可以访问protected成员
    }

    std::string getDepartment() {
        return department;
    }
};

int main() {
    Employee emp;
    emp.name = "John Doe"; // 访问public成员
    emp.setSalary(50000); // 通过public成员函数访问private成员
    std::cout << emp.name << "的薪水: " << emp.getSalary() << std::endl;

    Manager mgr;
    mgr.name = "Jane Smith";
    mgr.setDepartment("Sales"); // 访问protected成员
    std::cout << mgr.name << "的部门: " << mgr.getDepartment() << std::endl;

    // emp.salary = 60000; // 错误: 'salary' 是私有成员
    // mgr.department = "HR"; // 错误: 'department' 是保护成员，不能在类外部直接访问

    return 0;
}
```


## 3. 友元

在C++中，**友元（Friend）**机制允许非成员函数或类访问另一个类的私有（`private`）和保护（`protected`）成员。这打破了封装性，但有时在特定场景下是必要的，例如运算符重载或实现某些设计模式。

### 3.1 友元函数

**友元函数（Friend Function）**是定义在类外部的函数，但被授予访问该类私有和保护成员的权限。友元函数不是类的成员函数，因此不能通过对象来调用，而是作为普通函数调用。

**声明友元函数：**

在类定义内部使用`friend`关键字声明友元函数。

**示例：**

```cpp
#include <iostream>

class MyClass {
private:
    int privateVar;

public:
    MyClass() : privateVar(10) {}

    // 声明一个友元函数
    friend void displayPrivateVar(MyClass obj);
};

// 友元函数的定义
void displayPrivateVar(MyClass obj) {
    // 友元函数可以直接访问MyClass的private成员
    std::cout << "友元函数访问: privateVar = " << obj.privateVar << std::endl;
}

int main() {
    MyClass obj;
    displayPrivateVar(obj); // 作为普通函数调用友元函数
    return 0;
}
```

**友元函数的特点：**

*   友元函数不是类的成员函数，它不拥有`this`指针。
*   友元函数可以访问类的所有成员（`public`, `private`, `protected`）。
*   友元关系是单向的，如果函数A是类B的友元，不代表类B是函数A的友元。
*   友元关系不能被继承。


### 3.2 友元类

**友元类（Friend Class）**是指一个类被声明为另一个类的友元，这样友元类的所有成员函数都可以访问另一个类的私有和保护成员。

**声明友元类：**

在类定义内部使用`friend class`关键字声明友元类。

**示例：**

```cpp
#include <iostream>
#include <string>

class MyClass {
private:
    int privateData;

public:
    MyClass() : privateData(42) {}

    // 声明FriendClass为友元类
    friend class FriendClass;
};

class FriendClass {
public:
    void displayPrivateData(MyClass obj) {
        // FriendClass的成员函数可以访问MyClass的private成员
        std::cout << "友元类访问: privateData = " << obj.privateData << std::endl;
    }
};

int main() {
    MyClass myObj;
    FriendClass friendObj;
    friendObj.displayPrivateData(myObj);
    return 0;
}
```

**友元类的特点：**

*   如果类A是类B的友元，那么类A的所有成员函数都可以访问类B的私有和保护成员。
*   友元关系不是相互的：如果类A是类B的友元，类B不一定是类A的友元。
*   友元关系不能被继承：如果类A是类B的友元，类B的派生类不能自动成为类A的友元。
*   友元关系不能传递：如果类A是类B的友元，类B是类C的友元，不代表类A是类C的友元。


## 4. 继承

**继承（Inheritance）**是面向对象编程（OOP）的一个核心概念，它允许一个类（**派生类**或**子类**）从另一个类（**基类**或**父类**）继承属性和方法。这促进了代码的重用性，并建立了“is-a”关系。

### 4.1 单继承

**单继承（Single Inheritance）**是指一个派生类只从一个基类继承。

**语法：**

```cpp
class DerivedClass : access_specifier BaseClass {
    // 成员
};
```

其中`access_specifier`可以是`public`, `protected`, 或 `private`。

**示例：**

```cpp
#include <iostream>
#include <string>

// 基类
class Vehicle {
public:
    std::string brand = "Ford";
    void honk() {
        std::cout << "Tuut, tuut! \n";
    }
};

// 派生类 (单继承)
class Car : public Vehicle {
public:
    std::string model = "Mustang";
};

int main() {
    Car myCar;
    myCar.honk(); // 访问基类方法
    std::cout << myCar.brand << " " << myCar.model << std::endl; // 访问基类和派生类属性
    return 0;
}
```

### 4.2 多继承

**多继承（Multiple Inheritance）**是指一个派生类可以从多个基类继承属性和方法。

**语法：**

```cpp
class DerivedClass : access_specifier BaseClass1, access_specifier BaseClass2 {
    // 成员
};
```

**示例：**

```cpp
#include <iostream>
#include <string>

// 基类1
class LivingBeing {
public:
    void breathe() {
        std::cout << "Breathing...\n";
    }
};

// 基类2
class Animal {
public:
    void eat() {
        std::cout << "Eating...\n";
    }
};

// 派生类 (多继承)
class Dog : public LivingBeing, public Animal {
public:
    void bark() {
        std::cout << "Woof! Woof!\n";
    }
};

int main() {
    Dog myDog;
    myDog.breathe(); // 访问LivingBeing的方法
    myDog.eat();     // 访问Animal的方法
    myDog.bark();    // 访问Dog自己的方法
    return 0;
}
```

### 4.3 继承中的访问控制

派生类对基类成员的访问权限取决于继承方式（`public`, `protected`, `private`）以及基类成员本身的访问修饰符。

| 基类成员访问类型 | `public`继承 | `protected`继承 | `private`继承 |
|---|---|---|---|
| `public` | `public` | `protected` | `private` |
| `protected` | `protected` | `protected` | `private` |
| `private` | 不可访问 | 不可访问 | 不可访问 |

**示例：**

```cpp
#include <iostream>

class Base {
public:
    int publicVar;
protected:
    int protectedVar;
private:
    int privateVar; // 在派生类中不可直接访问

public:
    Base() : publicVar(1), protectedVar(2), privateVar(3) {}
    void showPrivateVar() {
        std::cout << "Base privateVar: " << privateVar << std::endl;
    }
};

class DerivedPublic : public Base {
public:
    void accessBaseMembers() {
        std::cout << "DerivedPublic: publicVar = " << publicVar << std::endl; // public
        std::cout << "DerivedPublic: protectedVar = " << protectedVar << std::endl; // protected
        // std::cout << privateVar; // 错误: privateVar不可访问
    }
};

class DerivedProtected : protected Base {
public:
    void accessBaseMembers() {
        std::cout << "DerivedProtected: publicVar = " << publicVar << std::endl; // protected
        std::cout << "DerivedProtected: protectedVar = " << protectedVar << std::endl; // protected
    }
};

class DerivedPrivate : private Base {
public:
    void accessBaseMembers() {
        std::cout << "DerivedPrivate: publicVar = " << publicVar << std::endl; // private
        std::cout << "DerivedPrivate: protectedVar = " << protectedVar << std::endl; // private
    }
};

int main() {
    DerivedPublic dp;
    std::cout << "main: dp.publicVar = " << dp.publicVar << std::endl; // public
    dp.accessBaseMembers();
    // std::cout << dp.protectedVar; // 错误: protected

    DerivedProtected dprot;
    // std::cout << dprot.publicVar; // 错误: protected
    dprot.accessBaseMembers();

    DerivedPrivate dpriv;
    // std::cout << dpriv.publicVar; // 错误: private
    dpriv.accessBaseMembers();

    return 0;
}
```

### 4.4 虚函数与多态

**多态（Polymorphism）**意味着“多种形式”，在C++中，它允许我们使用一个基类指针或引用来操作派生类对象，并根据实际对象的类型调用相应的函数。**虚函数（Virtual Function）**是实现运行时多态的关键。

**虚函数：**

在基类中声明为`virtual`的成员函数，允许在派生类中被重写（override），并通过基类指针或引用调用时，根据实际对象的类型来决定调用哪个版本的函数。

**纯虚函数与抽象类：**

如果一个虚函数在基类中被声明为`= 0`，则它是一个**纯虚函数（Pure Virtual Function）**。包含纯虚函数的类被称为**抽象类（Abstract Class）**，抽象类不能被实例化，只能作为基类使用。

**示例：**

```cpp
#include <iostream>
#include <string>

// 基类
class Animal {
public:
    std::string name;
    Animal(const std::string& n) : name(n) {}

    // 虚函数，实现运行时多态
    virtual void makeSound() const {
        std::cout << name << " makes a generic sound.\n";
    }

    // 纯虚函数，使Animal成为抽象类
    // virtual void move() const = 0;

    virtual ~Animal() { // 虚析构函数，确保正确释放派生类资源
        std::cout << name << " 的析构函数被调用.\n";
    }
};

// 派生类 Dog
class Dog : public Animal {
public:
    Dog(const std::string& n) : Animal(n) {}

    void makeSound() const override { // override关键字是C++11新特性，表示重写基类虚函数
        std::cout << name << " says Woof! Woof!\n";
    }

    // void move() const override {
    //     std::cout << name << " runs.\n";
    // }

    ~Dog() {
        std::cout << name << " (Dog) 的析构函数被调用.\n";
    }
};

// 派生类 Cat
class Cat : public Animal {
public:
    Cat(const std::string& n) : Animal(n) {}

    void makeSound() const override {
        std::cout << name << " says Meow!\n";
    }

    // void move() const override {
    //     std::cout << name << " walks quietly.\n";
    // }

    ~Cat() {
        std::cout << name << " (Cat) 的析构函数被调用.\n";
    }
};

void animalAction(const Animal& animal) {
    animal.makeSound(); // 多态调用
}

int main() {
    Dog myDog("Buddy");
    Cat myCat("Whiskers");

    // 通过基类引用实现多态
    animalAction(myDog);
    animalAction(myCat);

    // 通过基类指针实现多态
    Animal* animalPtr1 = &myDog;
    Animal* animalPtr2 = &myCat;

    animalPtr1->makeSound();
    animalPtr2->makeSound();

    // 动态内存分配和虚析构函数
    Animal* dynamicAnimal = new Dog("Max");
    dynamicAnimal->makeSound();
    delete dynamicAnimal; // 调用Dog的析构函数，然后是Animal的析构函数

    return 0;
}
```


