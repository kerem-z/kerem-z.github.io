---
layout: post
title:  "Von Neumann Arch"
date:   2024-09-04 13:45:40 +0300
categories: jekyll update
---
You'll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. You can rebuild the site in many different ways, but the most common way is to run `jekyll serve`, which launches a web server and auto-regenerates your site when a file is updated.

Von Neumann architecture, a fundamental concept in computer science, has several key components that can be considered as artifacts:

1. Control Unit (CU): Manages and coordinates the computer's operations.
2. Arithmetic Logic Unit (ALU): Performs mathematical and logical operations.
3. Memory Unit: Stores both data and instructions.
4. Input/Output (I/O) Devices: Allow communication with the external world.
5. Bus System: Facilitates data transfer between components.

In the context of AI, these architectural elements have influenced the design of neural networks and machine learning models:

1. The concept of stored programs in memory relates to how AI models store learned parameters.
2. The ALU's role is similar to activation functions in neural networks.
3. The bus system is analogous to the connections between neurons in AI models.
4. The control unit's function is comparable to the training algorithms that guide AI learning processes.

AI has also introduced new paradigms that extend beyond the von Neumann architecture, such as:

1. Parallel processing: Utilizing multiple cores or GPUs for faster computation.
2. Distributed computing: Spreading computations across multiple machines.
3. Neuromorphic computing: Designing hardware to mimic biological neural systems.

These advancements aim to overcome limitations of the von Neumann architecture, particularly the "von Neumann bottleneck" between processing and memory units, to better suit the needs of modern AI applications.

We can also use LaTeX to display equations. For example, here's the equation for a simple neural network:

$$ y = \sigma(\sum_{i=1}^n w_i x_i + b) $$

Where:
- $y$ is the output
- $\sigma$ is the activation function
- $w_i$ are the weights
- $x_i$ are the inputs
- $b$ is the bias

And here's the backpropagation algorithm in matrix form:

$$ \frac{\partial E}{\partial W^{(l)}} = \delta^{(l+1)} (a^{(l)})^T $$

Where:
- $E$ is the error function
- $W^{(l)}$ is the weight matrix for layer $l$
- $\delta^{(l+1)}$ is the error term for layer $l+1$
- $a^{(l)}$ is the activation for layer $l$

`YEAR-MONTH-DAY-title.MARKUP`

Where `YEAR` is a four-digit number, `MONTH` and `DAY` are both two-digit numbers, and `MARKUP` is the file extension representing the format used in the file. After that, include the necessary front matter. Take a look at the source for this post to get an idea about how it works.

Jekyll also offers powerful support for code snippets:

{% highlight ruby %}
def print_hi(name)
  puts "Hi, #{name}"
end
print_hi('Tom')
#=> prints 'Hi, Tom' to STDOUT.
{% endhighlight %}

Check out the [Jekyll docs][jekyll-docs] for more info on how to get the most out of Jekyll. File all bugs/feature requests at [Jekyll's GitHub repo][jekyll-gh]. If you have questions, you can ask them on [Jekyll Talk][jekyll-talk].

[jekyll-docs]: https://jekyllrb.com/docs/home
[jekyll-gh]:   https://github.com/jekyll/jekyll
[jekyll-talk]: https://talk.jekyllrb.com/
