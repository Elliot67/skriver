Slack

# Example

## text/plain

Hello
World
Everyone
This is a nice list
I am bold and I am italic and I am underlined and I am striked.
I am on the same paragraph, but on the next line

And I jumped a line.

Number one
Number two
Number three

And here I am a quote

Here a link to https://google.com and another link with a different link <=> label.

Here I am a plain text block of code

And here is an inline code sample which is nice.

Let’s not forget the emoji :slightly_smiling_face:

## slack/texty

{"ops":[{"insert":"Hello"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"World"},{"attributes":{"indent":1,"list":"bullet"},"insert":"\n"},{"insert":"Everyone"},{"attributes":{"indent":1,"list":"bullet"},"insert":"\n"},{"insert":"This is a nice list"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"I am "},{"attributes":{"bold":true},"insert":"bold"},{"insert":" and I am "},{"attributes":{"italic":true},"insert":"italic"},{"insert":" and I am "},{"attributes":{"underline":true},"insert":"underlined"},{"insert":" and I am "},{"attributes":{"strike":true},"insert":"striked"},{"insert":".\nI am on the same paragraph, but on the next line\n\nAnd I jumped a line.\n\nNumber one"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Number two"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Number three"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"\nAnd here I am a quote"},{"attributes":{"blockquote":true},"insert":"\n"},{"insert":"\nHere a link to "},{"attributes":{"link":"https://google.com"},"insert":"https://google.com"},{"insert":" and another "},{"attributes":{"link":"https://google.come"},"insert":"link"},{"insert":" with a different link <=> label.\n\nHere I am a plain text block of code"},{"attributes":{"code-block":true},"insert":"\n"},{"insert":"\nAnd here is an inline code sample "},{"attributes":{"code":true},"insert":"which is nice"},{"insert":".\n\nLet’s not forget the emoji "},{"insert":{"slackemoji":{"text":":slightly_smiling_face:"}}},{"insert":" "}]}

# Specification

Slack uses Quill Delta to represent its message : https://quilljs.com/docs/delta/
