# React from scratch

# Learnings

## <Component /> turns to React.createElement(Component, null)

Transpilation is handled by Babel. Babel converts JSX to React.createElement calls. So the JSX syntax is just syntactic sugar for React.

When you call createElement, it doesn't create a real DOM element. Instead, it creates an object that describes a DOM node.

## React.createElement

`createElement` will often have `createElement` in its children, so it may look like this: `React.createElement('h1', { title: 'foo' }, 'Hello World', React.createElement('h2', null, 'Hello World'))`. Here `title` is a prop and `Hello World` is the text child.

`typeof child === 'object' ? child : createTextElement(child)` will create a text element if the child is not an object:

```js
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
```

Functions or strings are passed as first argument to `createElement`. The second argument is an object with the props. The rest of the arguments are the children.

Passing a function component:

```js
function MyComponent(props) {
  return <div>{props.children}</div>
}

React.createElement(MyComponent, { prop1: 'value' }, 'Hello')
```

A function component is just a function. React calls it just like any other function. It passes the props and any context needed by the component.

## Render function

The render function gets the element to render and the container where to render it. The container is a DOM element. The element is the VDOM Node converted by Babel.

## vdom.type as function

Let's say we have a component like this:

```js
{
  type: MyComponent,  // Reference to the MyComponent function
  props: {
    children: []      // No children in this case
  }
}
```

The component when defined:

```js
function MyComponent() {
  return <h1>Hello World</h1>
}
```

We'd call it in the `render` function with its props `vdom.type(vdom.props)`. This will return a new VDOM node. We can then call `render` again with the new VDOM node.

It will end up like this when called with its props:

```js
{
  type: 'h1',
  props: {
    children: [
      { type: 'TEXT_ELEMENT', props: { nodeValue: 'Hello World', children: [] } }
    ]
  }
}
```

### Another example

```js
{
  type: Container,
  props: {
    children: [
      { type: Item, props: { children: [] } }
    ]
  }
}

function Container(props) {
  return <div>{props.children}</div>;
}
function Item() {
  return <span>An item</span>;
}

{
  type: 'div',
  props: {
    children: [
      {
        type: 'span',
        props: {
          children: [
            { type: 'TEXT_ELEMENT', props: { nodeValue: 'An item', children: [] } }
          ]
        }
      }
    ]
  }
}
```

## VDOM

This object is a virtual DOM element. The virtual DOM is a lightweight copy of the actual DOM, allowing React to do fast operations in memory without touching the real DOM. Touching the real DOM every time would be slow/expensive.

## Reconciliation

React compares the new VDOM with the previous one and figures out what has changed. This process is called reconciliation. React does not update the entire DOM tree. Instead, it updates only what's necessary.

## createTextNode for text nodes

Learned it's much better than using `innerHTML` or `innerText` to update text nodes. It's more efficient and safer.

- `document.createTextNode` creates a text node
- Treat as plain text, not HTML
- Escape special characters so they are displayed correctly
- Avoid HTML injection attacks
- Text nodes created with `document.createTextNode` can be updated individually without affecting other nodes in the DOM. Resulting in efficient updates.

# Notes

## Create element result

```js

// In JSX

<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

// createElement
React.createElement('ul', null, React.createElement('li', null, 'Item 1'), React.createElement('li', null, 'Item 2'));

// Output
{
  type: 'ul',
  props: {
    children: [
      {
        type: 'li',
        props: {
          children: [
            { type: 'TEXT_ELEMENT', props: { nodeValue: 'Item 1', children: [] } }
          ]
        }
      },
      {
        type: 'li',
        props: {
          children: [
            { type: 'TEXT_ELEMENT', props: { nodeValue: 'Item 2', children: [] } }
          ]
        }
      }
    ]
  }
}
```
