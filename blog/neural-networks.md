# Understanding Neural Networks: A Mathematical Perspective

Neural networks have become a cornerstone of modern machine learning. In this post, we'll explore their mathematical foundations and key concepts.

## The Basic Building Block: The Perceptron

The perceptron is the fundamental unit of neural networks. For an input vector x, the output is given by:

```math
f(x) = \sigma(w^T x + b)
```

where σ is the activation function, w is the weight vector, and b is the bias term.

## Activation Functions

Common activation functions include:

1. Sigmoid function:
```math
\sigma(x) = \frac{1}{1 + e^{-x}}
```

2. Hyperbolic tangent:
```math
\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}
```

3. ReLU (Rectified Linear Unit):
```math
\text{ReLU}(x) = \max(0, x)
```

## Backpropagation: The Chain Rule in Action

The backpropagation algorithm uses the chain rule of calculus to compute gradients. For a loss function L, we compute:

```math
\frac{\partial L}{\partial w_i} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial z} \cdot \frac{\partial z}{\partial w_i}
```

where z is the pre-activation output and y is the final output.

## The Universal Approximation Theorem

One of the most powerful results in neural network theory states that a feedforward network with a single hidden layer containing a finite number of neurons can approximate any continuous function on compact subsets of ℝⁿ, under mild assumptions about the activation function.

This theoretical foundation explains why neural networks are so effective at function approximation tasks. 