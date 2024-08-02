import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreeComponent} from './components/tree/tree.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TreeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'tree';
}
