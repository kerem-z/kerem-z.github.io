---
title: "Computationalism vs Connectionism"
date: 2023-09-24
layout: post
author_profile: true
mathjax: true
use_math: true
---

In the realm of cognitive science and artificial intelligence, two prominent paradigms often come into conflict: **Computationalism** and **Connectionism**. This post delves into the abstract mathematical foundations that underpin these theories.

## Computationalism

Computationalism posits that cognitive processes are akin to computations performed by a digital computer. This view is often formalized using the language of **Turing machines** and **symbolic logic**.

Consider the following abstract representation of a Turing machine:

$$
M = (Q, \Sigma, \Gamma, \delta, q_0, q_{accept}, q_{reject})
$$

where:
- \( Q \) is a finite set of states,
- \( \Sigma \) is the input alphabet,
- \( \Gamma \) is the tape alphabet,
- \( \delta \) is the transition function,
- \( q_0 \) is the initial state,
- \( q_{accept} \) is the accept state,
- \( q_{reject} \) is the reject state.

The computational process can be described by the function:

$$
f: \Sigma^* \to \Sigma^*
$$

## Connectionism

Connectionism, on the other hand, models cognitive processes using artificial neural networks. These networks are inspired by the structure and function of the human brain.

A simple neural network can be represented as:

$$
y = f(Wx + b)
$$

where:
- \( x \) is the input vector,
- \( W \) is the weight matrix,
- \( b \) is the bias vector,
- \( f \) is the activation function,
- \( y \) is the output vector.

The learning process in neural networks is often described by the **backpropagation algorithm**, which minimizes the error function \( E \):

$$
E = \frac{1}{2} \sum_{i=1}^n (y_i - \hat{y}_i)^2
$$

where:
- \( y_i \) is the actual output,
- \( \hat{y}_i \) is the predicted output.

## Conclusion

While computationalism emphasizes symbolic manipulation and rule-based processing, connectionism focuses on distributed representations and learning from data. Both paradigms offer valuable insights into the nature of cognition and continue to influence the development of artificial intelligence.